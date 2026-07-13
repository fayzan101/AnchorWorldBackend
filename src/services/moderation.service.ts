import { ContentReportRepository } from "../repositories/content-report.repository";
import { ModerationActionRepository } from "../repositories/moderation-action.repository";
import { UserRepository } from "../repositories/user.repository";
import { PostRepository } from "../repositories/post.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import {
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";
import { ModerationActionType } from "../entities/ModerationAction.entity";
import { AppError } from "../middleware/error.middleware";

export type ReportReasonInput = {
  reason?: string;
};

export type ModerationActionInput = {
  action: ModerationActionType;
  notes?: string;
};

export class ModerationService {
  private contentReportRepository: ContentReportRepository;
  private moderationActionRepository: ModerationActionRepository;
  private userRepository: UserRepository;
  private postRepository: PostRepository;
  private postCommentRepository: PostCommentRepository;

  constructor(
    contentReportRepository?: ContentReportRepository,
    moderationActionRepository?: ModerationActionRepository,
    userRepository?: UserRepository,
    postRepository?: PostRepository,
    postCommentRepository?: PostCommentRepository
  ) {
    this.contentReportRepository =
      contentReportRepository ?? new ContentReportRepository();
    this.moderationActionRepository =
      moderationActionRepository ?? new ModerationActionRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.postRepository = postRepository ?? new PostRepository();
    this.postCommentRepository =
      postCommentRepository ?? new PostCommentRepository();
  }

  async reportUser(
    reporterId: string,
    targetUserId: string,
    input: ReportReasonInput = {}
  ) {
    if (reporterId === targetUserId) {
      throw new AppError("You cannot report yourself", 400);
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError("User not found", 404);
    }

    const report = await this.createReport(
      reporterId,
      ReportTargetType.USER,
      targetUserId,
      input.reason
    );

    await this.userRepository.markReportById(targetUserId);

    return this.toReportDto(report);
  }

  async reportPost(
    reporterId: string,
    postId: string,
    input: ReportReasonInput = {}
  ) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    if (post.user_id === reporterId) {
      throw new AppError("You cannot report your own post", 400);
    }

    const report = await this.createReport(
      reporterId,
      ReportTargetType.POST,
      postId,
      input.reason
    );

    return this.toReportDto(report);
  }

  async reportComment(
    reporterId: string,
    commentId: string,
    input: ReportReasonInput = {}
  ) {
    const comment = await this.postCommentRepository.findById(commentId);
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    if (comment.user_id === reporterId) {
      throw new AppError("You cannot report your own comment", 400);
    }

    const report = await this.createReport(
      reporterId,
      ReportTargetType.COMMENT,
      commentId,
      input.reason
    );

    return this.toReportDto(report);
  }

  async listReports(
    status: string | undefined,
    page = 1,
    limit = 20
  ) {
    let reportStatus: ReportStatus | undefined;
    if (status) {
      if (!Object.values(ReportStatus).includes(status as ReportStatus)) {
        throw new AppError("Invalid report status", 400);
      }
      reportStatus = status as ReportStatus;
    }

    const { items, total } = await this.contentReportRepository.findByStatus(
      reportStatus,
      page,
      limit
    );

    return {
      items: items.map((r) => this.toReportDto(r)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async takeAction(
    adminId: string,
    reportId: string,
    input: ModerationActionInput
  ) {
    if (!Object.values(ModerationActionType).includes(input.action)) {
      throw new AppError("Invalid moderation action", 400);
    }

    const report = await this.contentReportRepository.findById(reportId);
    if (!report) {
      throw new AppError("Report not found", 404);
    }

    if (
      report.status === ReportStatus.DISMISSED ||
      report.status === ReportStatus.ACTIONED
    ) {
      throw new AppError("Report already resolved", 409);
    }

    if (input.action === ModerationActionType.HIDE_CONTENT) {
      await this.hideReportedContent(report.target_type, report.target_id);
    }

    const moderationAction = await this.moderationActionRepository.create({
      report_id: reportId,
      admin_id: adminId,
      action: input.action,
      notes: input.notes,
    });

    const nextStatus =
      input.action === ModerationActionType.DISMISS
        ? ReportStatus.DISMISSED
        : ReportStatus.ACTIONED;

    const updated = await this.contentReportRepository.updateStatus(
      reportId,
      nextStatus
    );

    return {
      report: updated ? this.toReportDto(updated) : null,
      action: {
        id: moderationAction.id,
        report_id: moderationAction.report_id,
        admin_id: moderationAction.admin_id,
        action: moderationAction.action,
        notes: moderationAction.notes,
        created_at: moderationAction.created_at,
      },
    };
  }

  private async createReport(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason?: string
  ) {
    const duplicate = await this.contentReportRepository.findOpenDuplicate(
      reporterId,
      targetType,
      targetId
    );
    if (duplicate) {
      throw new AppError("You already reported this content", 409);
    }

    return this.contentReportRepository.create({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
    });
  }

  private async hideReportedContent(
    targetType: ReportTargetType,
    targetId: string
  ): Promise<void> {
    if (targetType === ReportTargetType.POST) {
      const post = await this.postRepository.findById(targetId);
      if (post) {
        await this.postRepository.softDelete(targetId, post.user_id);
      }
      return;
    }

    if (targetType === ReportTargetType.COMMENT) {
      const comment = await this.postCommentRepository.findById(targetId);
      if (comment) {
        await this.postCommentRepository.softDelete(targetId, comment.user_id);
      }
    }
  }

  private toReportDto(report: {
    id: string;
    reporter_id: string;
    target_type: ReportTargetType;
    target_id: string;
    reason: string | null;
    status: ReportStatus;
    created_at: Date;
    updated_at: Date;
    reporter?: { id: string; full_name?: string };
  }) {
    return {
      id: report.id,
      reporter_id: report.reporter_id,
      reporter_name: report.reporter?.full_name ?? undefined,
      target_type: report.target_type,
      target_id: report.target_id,
      reason: report.reason,
      status: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at,
    };
  }
}
