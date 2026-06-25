import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./environment";
import { User } from "../entities/User.entity";
import { Follow } from "../entities/Follow.entity";
import { Message } from "../entities/Message.entity";
import { RefreshToken } from "../entities/RefreshToken.entity";
import { Like } from "../entities/Like.entity";
import { Notification } from "../entities/Notification.entity";
import { Hobby } from "../entities/Hobbies.entity";
import { RelationshipGoals } from "../entities/RelationshipGoals.entity";
import { PartnerQuality } from "../entities/PartnerQualities.entity";
import { UserPoints } from "../entities/UserPoints.entity";
import { PointTransaction } from "../entities/PointTransaction.entity";
import { Circle } from "../entities/Circle.entity";
import { CircleMember } from "../entities/CircleMember.entity";
import { Post } from "../entities/Post.entity";
import { PostLike } from "../entities/PostLike.entity";
import { PostComment } from "../entities/PostComment.entity";
import { CommunityUserFields1719000000001 } from "../migrations/1719000000001-CommunityUserFields";
import { InitialSchema1719000000000 } from "../migrations/1719000000000-InitialSchema";
import { PointsTables1719000000002 } from "../migrations/1719000000002-PointsTables";
import { CirclesTables1719000000003 } from "../migrations/1719000000003-CirclesTables";
import { PostsTables1719000000004 } from "../migrations/1719000000004-PostsTables";

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
    RefreshToken,
    Like,
    Notification,
    Hobby,
    RelationshipGoals,
    PartnerQuality,
    UserPoints,
    PointTransaction,
    Circle,
    CircleMember,
    Post,
    PostLike,
    PostComment,
  ],
  migrations: [
    InitialSchema1719000000000,
    CommunityUserFields1719000000001,
    PointsTables1719000000002,
    CirclesTables1719000000003,
    PostsTables1719000000004,
  ],
  subscribers: [],
  charset: "utf8mb4",
  timezone: "Z",
  extra: {
    connectionLimit: 10,
  },
});

