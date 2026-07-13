import { ModerationService } from "../services/moderation.service";
import { ContentReportRepository } from "../repositories/content-report.repository";
import { ModerationActionRepository } from "../repositories/moderation-action.repository";
import { UserRepository } from "../repositories/user.repository";
import { PostRepository } from "../repositories/post.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import {
  ContentReport,
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";
import {
  ModerationAction,
  ModerationActionType,
} from "../entities/ModerationAction.entity";
import { Post } from "../entities/Post.entity";
import { PostComment } from "../entities/PostComment.entity";
import { User } from "../entities/User.entity";

describe("ModerationService", () => {
  const reporterId = "reporter-1";
  const adminId = "admin-1";
  const targetUserId = "user-2";
  const postId = "post-1";
  const commentId = "comment-1";

  let contentReportRepository: jest.Mocked<ContentReportRepository>;
  let moderationActionRepository: jest.Mocked<ModerationActionRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let postRepository: jest.Mocked<PostRepository>;
  let postCommentRepository: jest.Mocked<PostCommentRepository>;
  let service: ModerationService;

  const mockReport = (
    overrides: Partial<ContentReport> = {}
  ): ContentReport =>
    ({
      id: "report-1",
      reporter_id: reporterId,
      target_type: ReportTargetType.POST,
      target_id: postId,
      reason: "spam",
      status: ReportStatus.OPEN,
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      ...overrides,
    }) as ContentReport;

  beforeEach(() => {
    contentReportRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findOpenDuplicate: jest.fn().mockResolvedValue(null),
      findByStatus: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<ContentReportRepository>;

    moderationActionRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ModerationActionRepository>;

    userRepository = {
      findById: jest.fn(),
      markReportById: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserRepository>;

    postRepository = {
      findById: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<PostRepository>;

    postCommentRepository = {
      findById: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<PostCommentRepository>;

    service = new ModerationService(
      contentReportRepository,
      moderationActionRepository,
      userRepository,
      postRepository,
      postCommentRepository
    );
  });

  it("reports a post and creates an open content report", async () => {
    postRepository.findById.mockResolvedValue({
      id: postId,
      user_id: targetUserId,
    } as Post);
    contentReportRepository.create.mockResolvedValue(
      mockReport({ target_type: ReportTargetType.POST })
    );

    const result = await service.reportPost(reporterId, postId, {
      reason: "spam",
    });

    expect(result.status).toBe(ReportStatus.OPEN);
    expect(contentReportRepository.create).toHaveBeenCalledWith({
      reporter_id: reporterId,
      target_type: ReportTargetType.POST,
      target_id: postId,
      reason: "spam",
    });
  });

  it("rejects reporting your own post", async () => {
    postRepository.findById.mockResolvedValue({
      id: postId,
      user_id: reporterId,
    } as Post);

    await expect(
      service.reportPost(reporterId, postId)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("reports a comment", async () => {
    postCommentRepository.findById.mockResolvedValue({
      id: commentId,
      user_id: targetUserId,
    } as PostComment);
    contentReportRepository.create.mockResolvedValue(
      mockReport({
        target_type: ReportTargetType.COMMENT,
        target_id: commentId,
      })
    );

    const result = await service.reportComment(reporterId, commentId);

    expect(result.target_type).toBe(ReportTargetType.COMMENT);
    expect(result.target_id).toBe(commentId);
  });

  it("reports a user and increments report_count", async () => {
    userRepository.findById.mockResolvedValue({ id: targetUserId } as User);
    contentReportRepository.create.mockResolvedValue(
      mockReport({
        target_type: ReportTargetType.USER,
        target_id: targetUserId,
      })
    );

    const result = await service.reportUser(reporterId, targetUserId, {
      reason: "harassment",
    });

    expect(result.target_type).toBe(ReportTargetType.USER);
    expect(userRepository.markReportById).toHaveBeenCalledWith(targetUserId);
  });

  it("rejects duplicate open reports", async () => {
    postRepository.findById.mockResolvedValue({
      id: postId,
      user_id: targetUserId,
    } as Post);
    contentReportRepository.findOpenDuplicate.mockResolvedValue(mockReport());

    await expect(
      service.reportPost(reporterId, postId)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lists open reports for admin", async () => {
    contentReportRepository.findByStatus.mockResolvedValue({
      items: [mockReport()],
      total: 1,
    });

    const result = await service.listReports("open", 1, 20);

    expect(result.items).toHaveLength(1);
    expect(contentReportRepository.findByStatus).toHaveBeenCalledWith(
      ReportStatus.OPEN,
      1,
      20
    );
  });

  it("dismisses a report", async () => {
    contentReportRepository.findById.mockResolvedValue(mockReport());
    moderationActionRepository.create.mockResolvedValue({
      id: "action-1",
      report_id: "report-1",
      admin_id: adminId,
      action: ModerationActionType.DISMISS,
      notes: null,
      created_at: new Date(),
    } as ModerationAction);
    contentReportRepository.updateStatus.mockResolvedValue(
      mockReport({ status: ReportStatus.DISMISSED })
    );

    const result = await service.takeAction(adminId, "report-1", {
      action: ModerationActionType.DISMISS,
    });

    expect(result.report?.status).toBe(ReportStatus.DISMISSED);
    expect(postRepository.softDelete).not.toHaveBeenCalled();
  });

  it("hides reported post content", async () => {
    contentReportRepository.findById.mockResolvedValue(
      mockReport({ target_type: ReportTargetType.POST, target_id: postId })
    );
    postRepository.findById.mockResolvedValue({
      id: postId,
      user_id: targetUserId,
    } as Post);
    moderationActionRepository.create.mockResolvedValue({
      id: "action-2",
      report_id: "report-1",
      admin_id: adminId,
      action: ModerationActionType.HIDE_CONTENT,
      notes: "spam",
      created_at: new Date(),
    } as ModerationAction);
    contentReportRepository.updateStatus.mockResolvedValue(
      mockReport({ status: ReportStatus.ACTIONED })
    );

    const result = await service.takeAction(adminId, "report-1", {
      action: ModerationActionType.HIDE_CONTENT,
      notes: "spam",
    });

    expect(postRepository.softDelete).toHaveBeenCalledWith(
      postId,
      targetUserId
    );
    expect(result.report?.status).toBe(ReportStatus.ACTIONED);
  });

  it("rejects action on already resolved report", async () => {
    contentReportRepository.findById.mockResolvedValue(
      mockReport({ status: ReportStatus.DISMISSED })
    );

    await expect(
      service.takeAction(adminId, "report-1", {
        action: ModerationActionType.DISMISS,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
