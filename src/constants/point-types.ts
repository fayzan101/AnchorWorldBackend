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
  CHAT_UNLOCK_SPENT: "chat_unlock_spent",
  REFERRAL_REFERRER: "referral_referrer",
  REFERRAL_REFEREE: "referral_referee",
} as const;

/** Points the initiator spends to unlock a free-tier chat pair. */
export const CHAT_UNLOCK_COST = 50;
/** Max chat partners a free user may unlock with points. */
export const FREE_CHAT_UNLOCK_MAX = 2;

export type PointType = (typeof PointTypes)[keyof typeof PointTypes];

export const PointAmounts: Record<string, number> = {
  // One-time / rare
  [PointTypes.PROFILE_COMPLETE]: 20,
  [PointTypes.FIRST_POST]: 25,
  [PointTypes.REFERRAL_REFERRER]: 25,
  [PointTypes.REFERRAL_REFEREE]: 15,
  [PointTypes.VIDEO_INTRO_COMPLETED]: 15,
  // Repeatable — kept low to discourage spam farming
  [PointTypes.POST_CREATED]: 5,
  [PointTypes.CIRCLE_POST]: 7,
  [PointTypes.CIRCLE_JOINED]: 5,
  [PointTypes.CONNECTION_MADE]: 10,
  [PointTypes.COMMENT_CREATED]: 1,
  [PointTypes.COMMENT_RECEIVED]: 1,
  [PointTypes.POST_LIKED_RECEIVED]: 1,
  [PointTypes.DAILY_LOGIN]: 2,
};
