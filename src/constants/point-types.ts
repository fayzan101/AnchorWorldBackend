export const PointTypes = {
  PROFILE_COMPLETE: "profile_complete",
  FIRST_POST: "first_post",
  POST_CREATED: "post_created",
  POST_LIKED_RECEIVED: "post_liked_received",
  COMMENT_CREATED: "comment_created",
  COMMENT_RECEIVED: "comment_received",
  CONNECTION_MADE: "connection_made",
  CIRCLE_JOINED: "circle_joined",
  CIRCLE_POST: "circle_post",
  DAILY_LOGIN: "daily_login",
  VIDEO_INTRO_COMPLETED: "video_intro_completed",
  VIDEO_INTRO_SPENT: "video_intro_spent",
  VIDEO_INTRO_REFUND: "video_intro_refund",
} as const;

export type PointType = (typeof PointTypes)[keyof typeof PointTypes];

export const PointAmounts: Record<string, number> = {
  [PointTypes.PROFILE_COMPLETE]: 100,
  [PointTypes.FIRST_POST]: 150,
  [PointTypes.POST_CREATED]: 25,
  [PointTypes.POST_LIKED_RECEIVED]: 5,
  [PointTypes.COMMENT_CREATED]: 15,
  [PointTypes.COMMENT_RECEIVED]: 10,
  [PointTypes.CONNECTION_MADE]: 50,
  [PointTypes.CIRCLE_JOINED]: 30,
  [PointTypes.CIRCLE_POST]: 40,
  [PointTypes.DAILY_LOGIN]: 10,
  [PointTypes.VIDEO_INTRO_COMPLETED]: 100,
};
