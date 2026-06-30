import { VideoCallRepository } from "../repositories/video-call.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { PointsService } from "./points.service";
import { AgoraService } from "./agora.service";
import { NotificationService } from "./notification.service";
import { AppError } from "../middleware/error.middleware";
import { VideoCall, VideoCallStatus } from "../entities/VideoCall.entity";
import { PointAmounts, PointTypes } from "../constants/point-types";
import { isEitherBlocked } from "../utils/block.util";
import { v4 as uuidv4 } from "uuid";
import {
  VideoCallRequestDto,
  VideoCallResponse,
  VideoCallTokenResponse,
} from "../types/video-call.types";

const INTRO_COSTS: Record<5 | 10, number> = {
  5: 500,
  10: 800,
};

const PENDING_TTL_MS = 60_000;
const MAX_REQUESTS_PER_DAY = 2;
const MIN_COMPLETION_SECONDS = 30;

export class VideoCallService {
  private videoCallRepository: VideoCallRepository;
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private pointsService: PointsService;
  private agoraService: AgoraService;
  private notificationService: NotificationService;
  private expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    videoCallRepository?: VideoCallRepository,
    followRepository?: FollowRepository,
    userRepository?: UserRepository,
    pointsService?: PointsService,
    agoraService?: AgoraService,
    notificationService?: NotificationService
  ) {
    this.videoCallRepository = videoCallRepository ?? new VideoCallRepository();
    this.followRepository = followRepository ?? new FollowRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.agoraService = agoraService ?? new AgoraService();
    this.notificationService = notificationService ?? new NotificationService();
  }

  async requestIntro(
    callerId: string,
    data: VideoCallRequestDto
  ): Promise<VideoCallResponse> {
    const { callee_id: calleeId, duration_minutes: durationMinutes } = data;

    if (callerId === calleeId) {
      throw new AppError("Cannot request a video intro with yourself", 400);
    }

    if (durationMinutes !== 5 && durationMinutes !== 10) {
      throw new AppError("duration_minutes must be 5 or 10", 400);
    }

    const callee = await this.userRepository.findById(calleeId);
    if (!callee) {
      throw new AppError("User not found", 404);
    }

    const isConnected = await this.followRepository.checkMutualFollow(
      callerId,
      calleeId
    );
    if (!isConnected) {
      throw new AppError("Video intros require a mutual connection", 403);
    }

    if (await isEitherBlocked(callerId, calleeId)) {
      throw new AppError("Cannot request a video intro with this user", 403);
    }

    const requestsToday =
      await this.videoCallRepository.countRequestsToday(callerId);
    if (requestsToday >= MAX_REQUESTS_PER_DAY) {
      throw new AppError("Daily video intro request limit reached", 429);
    }

    const pointsCost = INTRO_COSTS[durationMinutes];
    const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
    const callId = uuidv4();

    const call = await this.videoCallRepository.create({
      id: callId,
      caller_id: callerId,
      callee_id: calleeId,
      status: VideoCallStatus.PENDING,
      duration_minutes: durationMinutes,
      points_spent: pointsCost,
      channel_name: callId,
      expires_at: expiresAt,
    });

    try {
      await this.pointsService.spendPoints(
        callerId,
        pointsCost,
        PointTypes.VIDEO_INTRO_SPENT,
        call.id,
        `Video intro request (${durationMinutes} min)`
      );
    } catch (error) {
      await this.videoCallRepository.updateStatus(call.id, VideoCallStatus.CANCELLED);
      throw error;
    }

    this.scheduleExpiry(call.id, PENDING_TTL_MS);

    const caller = await this.userRepository.findById(callerId);
    this.notificationService
      .notifyVideoIntroRequest(
        calleeId,
        callerId,
        caller?.full_name ?? "Someone",
        call.id
      )
      .catch(console.error);

    const saved = await this.videoCallRepository.findById(call.id);
    return this.formatCall(saved!);
  }

  async acceptIntro(callId: string, userId: string): Promise<VideoCallResponse> {
    await this.getPendingCallForCallee(callId, userId);
    this.clearExpiryTimer(callId);

    const updated = await this.videoCallRepository.updateStatus(
      callId,
      VideoCallStatus.ACTIVE,
      { started_at: new Date() }
    );

    const call = updated!;
    this.notificationService
      .notifyVideoCallAccepted(call.caller_id, callId)
      .catch(console.error);

    return this.formatCall(call);
  }

  async rejectIntro(callId: string, userId: string): Promise<VideoCallResponse> {
    const call = await this.getPendingCallForCallee(callId, userId);
    this.clearExpiryTimer(callId);

    await this.refundCaller(call);
    const updated = await this.videoCallRepository.updateStatus(
      callId,
      VideoCallStatus.REJECTED,
      { ended_at: new Date() }
    );

    this.notificationService
      .notifyVideoCallRejected(call.caller_id, callId)
      .catch(console.error);

    return this.formatCall(updated!);
  }

  async cancelIntro(callId: string, userId: string): Promise<VideoCallResponse> {
    const call = await this.getPendingCallForCaller(callId, userId);
    this.clearExpiryTimer(callId);

    await this.refundCaller(call);
    const updated = await this.videoCallRepository.updateStatus(
      callId,
      VideoCallStatus.CANCELLED,
      { ended_at: new Date() }
    );

    return this.formatCall(updated!);
  }

  async endIntro(callId: string, userId: string): Promise<VideoCallResponse> {
    const call = await this.videoCallRepository.findById(callId);
    if (!call) {
      throw new AppError("Video call not found", 404);
    }

    if (call.caller_id !== userId && call.callee_id !== userId) {
      throw new AppError("Not authorized to end this call", 403);
    }

    if (call.status !== VideoCallStatus.ACTIVE) {
      throw new AppError("Call is not active", 400);
    }

    this.clearExpiryTimer(callId);
    const endedAt = new Date();
    const updated = await this.videoCallRepository.updateStatus(
      callId,
      VideoCallStatus.COMPLETED,
      { ended_at: endedAt }
    );

    if (call.started_at) {
      const durationSeconds =
        (endedAt.getTime() - new Date(call.started_at).getTime()) / 1000;
      if (durationSeconds > MIN_COMPLETION_SECONDS) {
        await this.awardCompletionPoints(call.caller_id, call.callee_id, callId);
      }
    }

    return this.formatCall(updated!);
  }

  async getToken(callId: string, userId: string): Promise<VideoCallTokenResponse> {
    const call = await this.videoCallRepository.findById(callId);
    if (!call) {
      throw new AppError("Video call not found", 404);
    }

    if (call.caller_id !== userId && call.callee_id !== userId) {
      throw new AppError("Not authorized to join this call", 403);
    }

    if (
      call.status !== VideoCallStatus.ACTIVE &&
      call.status !== VideoCallStatus.PENDING
    ) {
      throw new AppError("Call is not joinable", 400);
    }

    if (
      call.status === VideoCallStatus.PENDING &&
      call.expires_at <= new Date()
    ) {
      throw new AppError("Call request has expired", 410);
    }

    const tokenData = this.agoraService.generateRtcToken(
      call.channel_name,
      userId
    );

    return {
      call_id: call.id,
      channel_name: call.channel_name,
      ...tokenData,
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const { items, total } = await this.videoCallRepository.findHistory(
      userId,
      page,
      limit
    );

    return {
      items: items.map((call) => this.formatCall(call)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async expireCall(callId: string): Promise<void> {
    const call = await this.videoCallRepository.findById(callId);
    if (!call || call.status !== VideoCallStatus.PENDING) {
      return;
    }

    if (call.expires_at > new Date()) {
      return;
    }

    this.clearExpiryTimer(callId);
    await this.refundCaller(call);
    await this.videoCallRepository.updateStatus(callId, VideoCallStatus.MISSED, {
      ended_at: new Date(),
    });
  }

  private async getPendingCallForCallee(
    callId: string,
    userId: string
  ): Promise<VideoCall> {
    const call = await this.videoCallRepository.findById(callId);
    if (!call) {
      throw new AppError("Video call not found", 404);
    }
    if (call.callee_id !== userId) {
      throw new AppError("Not authorized to respond to this call", 403);
    }
    if (call.status !== VideoCallStatus.PENDING) {
      throw new AppError("Call is no longer pending", 400);
    }
    if (call.expires_at <= new Date()) {
      await this.expireCall(callId);
      throw new AppError("Call request has expired", 410);
    }
    return call;
  }

  private async getPendingCallForCaller(
    callId: string,
    userId: string
  ): Promise<VideoCall> {
    const call = await this.videoCallRepository.findById(callId);
    if (!call) {
      throw new AppError("Video call not found", 404);
    }
    if (call.caller_id !== userId) {
      throw new AppError("Not authorized to cancel this call", 403);
    }
    if (call.status !== VideoCallStatus.PENDING) {
      throw new AppError("Call is no longer pending", 400);
    }
    return call;
  }

  private async refundCaller(call: VideoCall): Promise<void> {
    await this.pointsService.awardPoints(
      call.caller_id,
      call.points_spent,
      PointTypes.VIDEO_INTRO_REFUND,
      call.id,
      "Video intro refunded"
    );
  }

  private async awardCompletionPoints(
    callerId: string,
    calleeId: string,
    callId: string
  ): Promise<void> {
    const amount = PointAmounts[PointTypes.VIDEO_INTRO_COMPLETED];
    const awards = [
      { userId: callerId, referenceId: `${callId}:caller` },
      { userId: calleeId, referenceId: `${callId}:callee` },
    ].sort((a, b) => a.userId.localeCompare(b.userId));

    for (const { userId, referenceId } of awards) {
      await this.pointsService.awardPointsOncePerReference(
        userId,
        amount,
        PointTypes.VIDEO_INTRO_COMPLETED,
        referenceId,
        "Video intro completed"
      );
    }
  }

  private scheduleExpiry(callId: string, ms: number): void {
    this.clearExpiryTimer(callId);
    const timer = setTimeout(() => {
      this.expireCall(callId).catch(console.error);
    }, ms);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.expiryTimers.set(callId, timer);
  }

  private clearExpiryTimer(callId: string): void {
    const timer = this.expiryTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(callId);
    }
  }

  private formatCall(call: VideoCall): VideoCallResponse {
    const response: VideoCallResponse = {
      id: call.id,
      caller_id: call.caller_id,
      callee_id: call.callee_id,
      status: call.status,
      duration_minutes: call.duration_minutes,
      points_spent: call.points_spent,
      channel_name: call.channel_name,
      started_at: call.started_at,
      ended_at: call.ended_at,
      expires_at: call.expires_at,
      created_at: call.created_at,
    };

    if (call.caller) {
      response.caller = {
        id: call.caller.id,
        full_name: call.caller.full_name,
        profile_picture: call.caller.profile_picture,
      };
    }

    if (call.callee) {
      response.callee = {
        id: call.callee.id,
        full_name: call.callee.full_name,
        profile_picture: call.callee.profile_picture,
      };
    }

    return response;
  }
}
