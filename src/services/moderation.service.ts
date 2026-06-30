import { ContentReportRepository } from "../repositories/content-report.repository";
import { PostRepository } from "../repositories/post.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import {
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";
import { ModerationActionType } from "../entities/ModerationAction.entity";

export type ModerationActionRequest =
  | "hide_content"
  | "dismiss"
  | "warn_user";

export class ModerationService {
  private contentReportRepository: ContentReportRepository;
  private postRepository: PostRepository;
  private postCommentRepository: PostCommentRepository;
  private userRepository: UserRepository;

  constructor(
    contentReportRepository?: ContentReportRepository,
    postRepository?: PostRepository,
    postCommentRepository?: PostCommentRepository,
    userRepository?: UserRepository
  ) {
    this.contentReportRepository =
      contentReportRepository ?? new ContentReportRepository();
    this.postRepository = postRepository ?? new PostRepository();
    this.postCommentRepository =
      postCommentRepository ?? new PostCommentRepository();
    this.userRepository = userRepository ?? new UserRepository();
  }

  async reportUser(
    reporterId: string,
    targetUserId: string,
    reason?: string
  ) {
    if (reporterId === targetUserId) {
      throw new AppError("Cannot report yourself", 400);
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await this.userRepository.markReportById(targetUserId);
    return this.createReport(
      reporterId,
      ReportTargetType.USER,
      targetUserId,
      reason
    );
  }

  async reportPost(reporterId: string, postId: string, reason?: string) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    return this.createReport(reporterId, ReportTargetType.POST, postId, reason);
  }

  async reportComment(reporterId: string, commentId: string, reason?: string) {
    const comment = await this.postCommentRepository.findById(commentId);
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    return this.createReport(
      reporterId,
      ReportTargetType.COMMENT,
      commentId,
      reason
    );
  }

  async listReports(status: ReportStatus = ReportStatus.OPEN, page = 1, limit = 20) {
    const { items, total } = await this.contentReportRepository.listByStatus(
      status,
      page,
      limit
    );

    return {
      items: items.map((report) => ({
        id: report.id,
        reporter_id: report.reporter_id,
        reporter_name: report.reporter?.full_name ?? null,
        target_type: report.target_type,
        target_id: report.target_id,
        reason: report.reason,
        status: report.status,
        created_at: report.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async takeAction(
    reportId: string,
    adminId: string,
    action: ModerationActionRequest,
    notes?: string
  ) {
    const report = await this.contentReportRepository.findById(reportId);
    if (!report) {
      throw new AppError("Report not found", 404);
    }

    if (report.status !== ReportStatus.OPEN) {
      throw new AppError("Report is already closed", 400);
    }

    const actionType = this.toActionType(action);

    if (actionType === ModerationActionType.HIDE_CONTENT) {
      await this.hideReportedContent(report.target_type, report.target_id);
    }

    const moderationAction = await this.contentReportRepository.createAction({
      report_id: reportId,
      admin_id: adminId,
      action: actionType,
      notes,
    });

    const nextStatus =
      actionType === ModerationActionType.DISMISS
        ? ReportStatus.DISMISSED
        : ReportStatus.ACTIONED;

    const updated = await this.contentReportRepository.updateStatus(
      reportId,
      nextStatus
    );

    return {
      report: {
        id: updated!.id,
        status: updated!.status,
        target_type: updated!.target_type,
        target_id: updated!.target_id,
      },
      action: {
        id: moderationAction.id,
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
    const report = await this.contentReportRepository.createReport({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
    });

    return {
      id: report.id,
      target_type: report.target_type,
      target_id: report.target_id,
      status: report.status,
      created_at: report.created_at,
    };
  }

  private toActionType(action: ModerationActionRequest): ModerationActionType {
    switch (action) {
      case "hide_content":
        return ModerationActionType.HIDE_CONTENT;
      case "warn_user":
        return ModerationActionType.WARN_USER;
      default:
        return ModerationActionType.DISMISS;
    }
  }

  private async hideReportedContent(
    targetType: ReportTargetType,
    targetId: string
  ) {
    switch (targetType) {
      case ReportTargetType.POST: {
        const post = await this.postRepository.findById(targetId);
        if (post) {
          await this.postRepository.softDeleteById(targetId);
        }
        break;
      }
      case ReportTargetType.COMMENT: {
        const comment = await this.postCommentRepository.findById(targetId);
        if (comment) {
          await this.postCommentRepository.softDeleteById(targetId);
          await this.postRepository.decrementCommentCount(comment.post_id);
        }
        break;
      }
      default:
        break;
    }
  }
}
