import { ModerationService } from "../services/moderation.service";
import { ContentReportRepository } from "../repositories/content-report.repository";
import { PostRepository } from "../repositories/post.repository";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  ContentReport,
  ReportStatus,
  ReportTargetType,
} from "../entities/ContentReport.entity";
import { Post } from "../entities/Post.entity";
import { User } from "../entities/User.entity";
import { ModerationActionType } from "../entities/ModerationAction.entity";

describe("ModerationService", () => {
  const reporterId = "reporter-id";
  const targetUserId = "target-user-id";
  let contentReportRepository: jest.Mocked<ContentReportRepository>;
  let postRepository: jest.Mocked<PostRepository>;
  let postCommentRepository: jest.Mocked<PostCommentRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let service: ModerationService;

  beforeEach(() => {
    contentReportRepository = {
      createReport: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      createAction: jest.fn(),
      listByStatus: jest.fn(),
    } as unknown as jest.Mocked<ContentReportRepository>;

    postRepository = {
      findById: jest.fn(),
      softDeleteById: jest.fn(),
      decrementCommentCount: jest.fn(),
    } as unknown as jest.Mocked<PostRepository>;

    postCommentRepository = {
      findById: jest.fn(),
      softDeleteById: jest.fn(),
    } as unknown as jest.Mocked<PostCommentRepository>;

    userRepository = {
      findById: jest.fn(),
      markReportById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    service = new ModerationService(
      contentReportRepository,
      postRepository,
      postCommentRepository,
      userRepository
    );
  });

  it("reports a user and increments report count", async () => {
    userRepository.findById.mockResolvedValue({ id: targetUserId } as User);
    contentReportRepository.createReport.mockResolvedValue({
      id: "report-1",
      target_type: ReportTargetType.USER,
      target_id: targetUserId,
      status: ReportStatus.OPEN,
      created_at: new Date(),
    } as ContentReport);

    const result = await service.reportUser(reporterId, targetUserId, "spam");

    expect(userRepository.markReportById).toHaveBeenCalledWith(targetUserId);
    expect(result.target_type).toBe("user");
  });

  it("creates a post report", async () => {
    postRepository.findById.mockResolvedValue({ id: "post-1" } as Post);
    contentReportRepository.createReport.mockResolvedValue({
      id: "report-2",
      target_type: ReportTargetType.POST,
      target_id: "post-1",
      status: ReportStatus.OPEN,
      created_at: new Date(),
    } as ContentReport);

    const result = await service.reportPost(reporterId, "post-1");

    expect(result.target_type).toBe("post");
  });

  it("hides content when admin takes hide_content action", async () => {
    contentReportRepository.findById.mockResolvedValue({
      id: "report-3",
      status: ReportStatus.OPEN,
      target_type: ReportTargetType.POST,
      target_id: "post-1",
    } as ContentReport);
    postRepository.findById.mockResolvedValue({ id: "post-1" } as Post);
    contentReportRepository.createAction.mockResolvedValue({
      id: "action-1",
      action: ModerationActionType.HIDE_CONTENT,
      notes: null,
      created_at: new Date(),
    } as never);
    contentReportRepository.updateStatus.mockResolvedValue({
      id: "report-3",
      status: ReportStatus.ACTIONED,
      target_type: ReportTargetType.POST,
      target_id: "post-1",
    } as ContentReport);

    await service.takeAction("report-3", "admin-id", "hide_content");

    expect(postRepository.softDeleteById).toHaveBeenCalledWith("post-1");
  });

  it("dismisses a report without hiding content", async () => {
    contentReportRepository.findById.mockResolvedValue({
      id: "report-4",
      status: ReportStatus.OPEN,
      target_type: ReportTargetType.USER,
      target_id: targetUserId,
    } as ContentReport);
    contentReportRepository.createAction.mockResolvedValue({
      id: "action-2",
      action: ModerationActionType.DISMISS,
      notes: null,
      created_at: new Date(),
    } as never);
    contentReportRepository.updateStatus.mockResolvedValue({
      id: "report-4",
      status: ReportStatus.DISMISSED,
      target_type: ReportTargetType.USER,
      target_id: targetUserId,
    } as ContentReport);

    const result = await service.takeAction("report-4", "admin-id", "dismiss");

    expect(result.report.status).toBe("dismissed");
    expect(postRepository.softDeleteById).not.toHaveBeenCalled();
  });
});
