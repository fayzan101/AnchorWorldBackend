import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./environment";
import { User } from "../entities/User.entity";
import { Follow } from "../entities/Follow.entity";
import { Message } from "../entities/Message.entity";
import { RefreshToken } from "../entities/RefreshToken.entity";
import { Notification } from "../entities/Notification.entity";
import { Hobby } from "../entities/Hobbies.entity";
import { UserPoints } from "../entities/UserPoints.entity";
import { PointTransaction } from "../entities/PointTransaction.entity";
import { Circle } from "../entities/Circle.entity";
import { CircleMember } from "../entities/CircleMember.entity";
import { Post } from "../entities/Post.entity";
import { PostLike } from "../entities/PostLike.entity";
import { PostComment } from "../entities/PostComment.entity";
import { CommentLike } from "../entities/CommentLike.entity";
import { VideoCall } from "../entities/VideoCall.entity";
import { UserBlock } from "../entities/UserBlock.entity";
import { ContentReport } from "../entities/ContentReport.entity";
import { ModerationAction } from "../entities/ModerationAction.entity";
import { Referral } from "../entities/Referral.entity";
import { ChatUnlock } from "../entities/ChatUnlock.entity";
import { MessageHide } from "../entities/MessageHide.entity";
import { CommunityUserFields1719000000001 } from "../migrations/1719000000001-CommunityUserFields";
import { InitialSchema1719000000000 } from "../migrations/1719000000000-InitialSchema";
import { PointsTables1719000000002 } from "../migrations/1719000000002-PointsTables";
import { CirclesTables1719000000003 } from "../migrations/1719000000003-CirclesTables";
import { PostsTables1719000000004 } from "../migrations/1719000000004-PostsTables";
import { VideoCallsTable1719000000005 } from "../migrations/1719000000005-VideoCallsTable";
import { NotificationTypesAndData1719000000006 } from "../migrations/1719000000006-NotificationTypesAndData";
import { BlocksAndModerationTables1719000000007 } from "../migrations/1719000000007-BlocksAndModerationTables";
import { NotificationReadStatus1719000000008 } from "../migrations/1719000000008-NotificationReadStatus";
import { PremiumSubscription1719000000009 } from "../migrations/1719000000009-PremiumSubscription";
import { PremiumProductId1719000000010 } from "../migrations/1719000000010-PremiumProductId";
import { Referrals1719000000011 } from "../migrations/1719000000011-Referrals";
import { BasicPlanChatUnlockCallType1719000000012 } from "../migrations/1719000000012-BasicPlanChatUnlockCallType";
import { WidenPointTransactionReferenceId1719000000013 } from "../migrations/1719000000013-WidenPointTransactionReferenceId";
import { MessageReplyTo1719000000014 } from "../migrations/1719000000014-MessageReplyTo";
import { MessageSoftDelete1719000000015 } from "../migrations/1719000000015-MessageSoftDelete";
import { DropUnusedDatingUserColumns1719000000016 } from "../migrations/1719000000016-DropUnusedDatingUserColumns";
import { CommentLikesAndReply1719000000017 } from "../migrations/1719000000017-CommentLikesAndReply";
import { DropUnusedDatingLookupTables1719000000018 } from "../migrations/1719000000018-DropUnusedDatingLookupTables";
import { EmailVerification1719000000019 } from "../migrations/1719000000019-EmailVerification";
import { CurateFeaturedCircles1719000000020 } from "../migrations/1719000000020-CurateFeaturedCircles";
import { PostShareSourceAndNotify1719000000021 } from "../migrations/1719000000021-PostShareSourceAndNotify";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: config.server.nodeEnv === "development",
  entities: [
    User,
    Follow,
    Message,
    MessageHide,
    RefreshToken,
    Notification,
    Hobby,
    UserPoints,
    PointTransaction,
    Circle,
    CircleMember,
    Post,
    PostLike,
    PostComment,
    CommentLike,
    VideoCall,
    UserBlock,
    ContentReport,
    ModerationAction,
    Referral,
    ChatUnlock,
  ],
  migrations: [
    InitialSchema1719000000000,
    CommunityUserFields1719000000001,
    PointsTables1719000000002,
    CirclesTables1719000000003,
    PostsTables1719000000004,
    VideoCallsTable1719000000005,
    NotificationTypesAndData1719000000006,
    BlocksAndModerationTables1719000000007,
    NotificationReadStatus1719000000008,
    PremiumSubscription1719000000009,
    PremiumProductId1719000000010,
    Referrals1719000000011,
    BasicPlanChatUnlockCallType1719000000012,
    WidenPointTransactionReferenceId1719000000013,
    MessageReplyTo1719000000014,
    MessageSoftDelete1719000000015,
    DropUnusedDatingUserColumns1719000000016,
    CommentLikesAndReply1719000000017,
    DropUnusedDatingLookupTables1719000000018,
    EmailVerification1719000000019,
    CurateFeaturedCircles1719000000020,
    PostShareSourceAndNotify1719000000021,
  ],
  subscribers: [],
  charset: "utf8mb4",
  timezone: "Z",
  extra: {
    connectionLimit: 10,
  },
});

