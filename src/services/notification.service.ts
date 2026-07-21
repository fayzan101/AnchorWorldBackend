import { getMessaging } from "../config/firebase";
import { Notification } from "../entities/Notification.entity";
import { NotificationRepository } from "../repositories/notification.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  NotificationType,
  POINTS_MILESTONE_BALANCE,
} from "../constants/notification-types";
import {
  emitPostCommented,
  emitPostLiked,
  emitVideoCallAccepted,
  emitVideoCallRequest,
} from "./socket-event.service";
import { AppError } from "../middleware/error.middleware";
import admin from "firebase-admin";

export { NotificationType } from "../constants/notification-types";

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  highPriority?: boolean;
}

export interface NotificationListItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: Date;
}

export class NotificationService {
  private userRepository: UserRepository;
  private notificationRepository: NotificationRepository;

  constructor(
    userRepository?: UserRepository,
    notificationRepository?: NotificationRepository
  ) {
    this.userRepository = userRepository ?? new UserRepository();
    this.notificationRepository =
      notificationRepository ?? new NotificationRepository();
  }

  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const messaging = getMessaging();
      if (!messaging) {
        console.warn("⚠️ Firebase messaging not initialized");
        return false;
      }

      const user = await this.userRepository.findById(userId);
      if (!user || !user.fcm_token || !user.notifications_enabled) {
        console.log(
          `User ${userId} has no FCM token or notifications disabled`
        );
        return false;
      }

      const message: admin.messaging.Message = {
        token: user.fcm_token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: payload.type,
          ...payload.data,
        },
        android: {
          priority: payload.highPriority ? "high" : "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          headers: payload.highPriority
            ? { "apns-priority": "10" }
            : undefined,
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      console.log("✅ Notification sent successfully:", response);
      return true;
    } catch (error: unknown) {
      const err = error as { code?: string };
      console.error("❌ Error sending notification:", error);

      if (
        err.code === "messaging/invalid-registration-token" ||
        err.code === "messaging/registration-token-not-registered"
      ) {
        await this.userRepository.update(userId, { fcm_token: null });
        console.log(`Removed invalid FCM token for user ${userId}`);
      }

      return false;
    }
  }

  async sendToMultipleUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ success: number; failure: number }> {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, payload))
    );

    const success = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const failure = results.length - success;

    return { success, failure };
  }

  private async persistNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, string>
  ): Promise<void> {
    try {
      await this.notificationRepository.create({
        user_id: userId,
        title,
        body,
        type,
        data: data ?? null,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async notifyNewMessage(
    receiverId: string,
    senderName: string,
    messagePreview: string,
    senderId: string
  ): Promise<boolean> {
    const body =
      messagePreview.length > 100
        ? messagePreview.substring(0, 100) + "..."
        : messagePreview;

    const data = {
      screen: "Chat",
      senderId,
      sender_id: senderId,
      senderName,
      peerId: senderId,
    };

    await this.persistNotification(
      receiverId,
      `New message from ${senderName}`,
      body,
      NotificationType.NEW_MESSAGE,
      data
    );

    return await this.sendToUser(receiverId, {
      title: `New message from ${senderName}`,
      body,
      type: NotificationType.NEW_MESSAGE,
      data,
    });
  }

  async notifyConnectionRequest(
    receiverId: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    await this.persistNotification(
      receiverId,
      "New Connection Request",
      `${senderName} sent you a connection request`,
      NotificationType.FRIEND_REQUEST,
      { screen: "ConnectionRequests", senderId }
    );

    return await this.sendToUser(receiverId, {
      title: "New Connection Request",
      body: `${senderName} sent you a connection request`,
      type: NotificationType.FRIEND_REQUEST,
      data: { screen: "ConnectionRequests", senderId },
    });
  }

  /** @deprecated Use notifyConnectionRequest */
  async notifyFriendRequest(
    receiverId: string,
    senderName: string,
    senderId: string
  ): Promise<boolean> {
    return this.notifyConnectionRequest(receiverId, senderName, senderId);
  }

  async notifyConnectionMade(
    receiverId: string,
    accepterName: string,
    accepterId: string
  ): Promise<boolean> {
    await this.persistNotification(
      receiverId,
      "Connection Made",
      `${accepterName} is now your connection`,
      NotificationType.CONNECTION_MADE,
      { screen: "Profile", userId: accepterId }
    );

    return await this.sendToUser(receiverId, {
      title: "Connection Made",
      body: `${accepterName} is now your connection`,
      type: NotificationType.CONNECTION_MADE,
      data: { screen: "Profile", userId: accepterId },
    });
  }

  /** @deprecated Use notifyConnectionMade */
  async notifyFriendAccept(
    receiverId: string,
    accepterName: string,
    accepterId: string
  ): Promise<boolean> {
    return this.notifyConnectionMade(receiverId, accepterName, accepterId);
  }

  async notifyLike(
    receiverId: string,
    likerName: string,
    likerId: string
  ): Promise<boolean> {
    await this.persistNotification(
      receiverId,
      "New Like",
      `${likerName} liked your profile`,
      NotificationType.NEW_LIKE,
      { screen: "Profile", userId: likerId }
    );

    return await this.sendToUser(receiverId, {
      title: "New Like",
      body: `${likerName} liked your profile`,
      type: NotificationType.NEW_LIKE,
      data: { screen: "Profile", userId: likerId },
    });
  }

  async notifyPostLiked(
    postOwnerId: string,
    likerId: string,
    likerName: string,
    postId: string
  ): Promise<boolean> {
    if (postOwnerId === likerId) {
      return false;
    }

    emitPostLiked(postOwnerId, {
      post_id: postId,
      user_id: likerId,
      user_name: likerName,
    });

    await this.persistNotification(
      postOwnerId,
      "Post Liked",
      `${likerName} liked your post`,
      NotificationType.POST_LIKED,
      { screen: "Post", postId, userId: likerId }
    );

    return await this.sendToUser(postOwnerId, {
      title: "Post Liked",
      body: `${likerName} liked your post`,
      type: NotificationType.POST_LIKED,
      data: { screen: "Post", postId, userId: likerId },
    });
  }

  async notifyPostCommented(
    postOwnerId: string,
    commenterId: string,
    commenterName: string,
    postId: string,
    commentId: string
  ): Promise<boolean> {
    if (postOwnerId === commenterId) {
      return false;
    }

    emitPostCommented(postOwnerId, {
      post_id: postId,
      comment_id: commentId,
      user_id: commenterId,
    });

    await this.persistNotification(
      postOwnerId,
      "New Comment",
      `${commenterName} commented on your post`,
      NotificationType.POST_COMMENTED,
      { screen: "Post", postId, commentId, userId: commenterId }
    );

    return await this.sendToUser(postOwnerId, {
      title: "New Comment",
      body: `${commenterName} commented on your post`,
      type: NotificationType.POST_COMMENTED,
      data: { screen: "Post", postId, commentId, userId: commenterId },
    });
  }

  async notifyPointsMilestone(
    userId: string,
    balance: number
  ): Promise<boolean> {
    if (balance < POINTS_MILESTONE_BALANCE) {
      return false;
    }

    const body = `You've reached ${balance} Anchor Points!`;

    await this.persistNotification(
      userId,
      "Points Milestone",
      body,
      NotificationType.POINTS_EARNED,
      { screen: "Points", balance: String(balance) }
    );

    return await this.sendToUser(userId, {
      title: "Points Milestone",
      body,
      type: NotificationType.POINTS_EARNED,
      data: { screen: "Points", balance: String(balance) },
    });
  }

  async notifyVideoIntroRequest(
    calleeId: string,
    callerId: string,
    callerName: string,
    callId: string
  ): Promise<boolean> {
    emitVideoCallRequest(calleeId, {
      call_id: callId,
      caller_id: callerId,
      caller_name: callerName,
    });

    await this.persistNotification(
      calleeId,
      "Video Intro Request",
      `${callerName} wants a guided video intro`,
      NotificationType.VIDEO_CALL_REQUEST,
      { screen: "VideoIntro", callId, callerId }
    );

    return await this.sendToUser(calleeId, {
      title: "Video Intro Request",
      body: `${callerName} wants a guided video intro`,
      type: NotificationType.VIDEO_CALL_REQUEST,
      data: { screen: "VideoIntro", callId, callerId },
      highPriority: true,
    });
  }

  async notifyVideoCallAccepted(
    callerId: string,
    callId: string
  ): Promise<boolean> {
    emitVideoCallAccepted(callerId, { call_id: callId });

    await this.persistNotification(
      callerId,
      "Video Intro Accepted",
      "Your video intro request was accepted",
      NotificationType.VIDEO_CALL_ACCEPTED,
      { screen: "VideoIntro", callId }
    );

    return await this.sendToUser(callerId, {
      title: "Video Intro Accepted",
      body: "Your video intro request was accepted",
      type: NotificationType.VIDEO_CALL_ACCEPTED,
      data: { screen: "VideoIntro", callId },
    });
  }

  async notifyVideoCallRejected(
    callerId: string,
    callId: string
  ): Promise<boolean> {
    await this.persistNotification(
      callerId,
      "Video Intro Declined",
      "Your video intro request was declined",
      NotificationType.VIDEO_CALL_REJECTED,
      { screen: "VideoIntro", callId }
    );

    return await this.sendToUser(callerId, {
      title: "Video Intro Declined",
      body: "Your video intro request was declined",
      type: NotificationType.VIDEO_CALL_REJECTED,
      data: { screen: "VideoIntro", callId },
    });
  }

  /** Intentionally no-op: joining a circle should not create an inbox notification. */
  async notifyCircleJoin(
    _userId: string,
    _circleName: string,
    _circleId: string
  ): Promise<boolean> {
    return false;
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(userId, { fcm_token: fcmToken });
    console.log(`✅ FCM token updated for user ${userId}`);
  }

  async removeFCMToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, { fcm_token: null });
    console.log(`✅ FCM token removed for user ${userId}`);
  }

  async toggleNotifications(userId: string, enabled: boolean): Promise<void> {
    await this.userRepository.update(userId, {
      notifications_enabled: enabled,
    });
    console.log(
      `✅ Notifications ${enabled ? "enabled" : "disabled"} for user ${userId}`
    );
  }

  async getNotifications(userId: string): Promise<NotificationListItem[]> {
    const notifications =
      await this.notificationRepository.findByUserId(userId);
    return notifications.map((notification) => this.formatNotification(notification));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    const updated = await this.notificationRepository.markAsRead(
      notificationId,
      userId
    );
    if (!updated) {
      throw new AppError("Notification not found", 404);
    }
    return this.formatNotification(updated);
  }

  async markAllAsRead(userId: string) {
    const updated = await this.notificationRepository.markAllAsRead(userId);
    return { updated };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const existing = await this.notificationRepository.findById(notificationId);
    if (!existing || (existing.user_id && existing.user_id !== userId)) {
      throw new AppError("Notification not found", 404);
    }
    await this.notificationRepository.delete(notificationId);
    return { deleted: true };
  }

  async deleteAllNotifications(userId: string) {
    const deleted = await this.notificationRepository.deleteAllForUser(userId);
    return { deleted };
  }

  private formatNotification(notification: Notification): NotificationListItem {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      data: notification.data ?? null,
      is_read: Boolean(notification.is_read),
      created_at: notification.created_at,
    };
  }
}
