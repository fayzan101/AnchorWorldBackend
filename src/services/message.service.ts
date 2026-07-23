import { MessageRepository } from "../repositories/message.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { ChatUnlockRepository } from "../repositories/chat-unlock.repository";
import { PointsService } from "./points.service";
import { PremiumService } from "./premium.service";
import { AppError } from "../middleware/error.middleware";
import { PaginationQuery } from "../types";
import { isEitherBlocked, hasBlocked } from "../utils/block.util";
import {
  CHAT_UNLOCK_COST,
  FREE_CHAT_UNLOCK_MAX,
  PointTypes,
} from "../constants/point-types";
import { Message, MessageType } from "../entities/Message.entity";
import { normalizeChatPair } from "../entities/ChatUnlock.entity";
import { emitChatUnlocked } from "./socket-event.service";

export class MessageService {
  private messageRepository: MessageRepository;
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private chatUnlockRepository: ChatUnlockRepository;
  private pointsService: PointsService;
  private premiumService: PremiumService;

  constructor(
    messageRepository?: MessageRepository,
    followRepository?: FollowRepository,
    userRepository?: UserRepository,
    chatUnlockRepository?: ChatUnlockRepository,
    pointsService?: PointsService,
    premiumService?: PremiumService
  ) {
    this.messageRepository = messageRepository ?? new MessageRepository();
    this.followRepository = followRepository ?? new FollowRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.chatUnlockRepository =
      chatUnlockRepository ?? new ChatUnlockRepository();
    this.pointsService = pointsService ?? new PointsService();
    this.premiumService = premiumService ?? new PremiumService();
  }

  async getChatAccess(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new AppError("Invalid peer", 400);
    }

    const peer = await this.userRepository.findById(otherUserId);
    if (!peer) throw new AppError("User not found", 404);

    const connected = await this.followRepository.checkMutualFollow(
      userId,
      otherUserId
    );
    const blockedByMe = await hasBlocked(userId, otherUserId);
    const blockedByPeer = await hasBlocked(otherUserId, userId);
    const user = await this.premiumService.ensurePlansActive(userId);
    const plan = this.premiumService.effectivePlan(user);
    const unlimited = plan !== "free";
    const unlocked = await this.chatUnlockRepository.isUnlocked(
      userId,
      otherUserId
    );
    const slotsUsed =
      await this.chatUnlockRepository.countUnlockedBy(userId);
    const myBalance = (await this.pointsService.getBalance(userId)).balance;
    const peerBalance = (await this.pointsService.getBalance(otherUserId))
      .balance;

    // Blocked peer must not learn they were blocked: report can_message as if
    // messaging works when connected/unlocked. Delivery is still rejected in
    // assertCanMessage. Only the blocker sees blocked_by_me + Unblock UI.
    const canMessage =
      connected &&
      !blockedByMe &&
      (unlimited || unlocked);

    const canUnlock =
      connected &&
      !blockedByMe &&
      !blockedByPeer &&
      !unlimited &&
      !unlocked &&
      slotsUsed < FREE_CHAT_UNLOCK_MAX &&
      myBalance >= CHAT_UNLOCK_COST;

    let reason: string | null = null;
    if (!connected) {
      reason = "not_connected";
    } else if (blockedByMe) {
      reason = "blocked_by_me";
    } else if (blockedByPeer) {
      // Appear normal — no lock banner, no "blocked" reason.
      reason = canMessage ? null : (unlimited || unlocked)
        ? null
        : slotsUsed >= FREE_CHAT_UNLOCK_MAX
          ? "slot_limit"
          : myBalance < CHAT_UNLOCK_COST
            ? "insufficient_points"
            : "chat_locked";
    } else if (!canMessage) {
      if (slotsUsed >= FREE_CHAT_UNLOCK_MAX) reason = "slot_limit";
      else if (myBalance < CHAT_UNLOCK_COST) reason = "insufficient_points";
      else reason = "chat_locked";
    }

    return {
      connected,
      blocked: blockedByMe, // only true when *I* blocked them (for Unblock UI)
      blocked_by_me: blockedByMe,
      blocked_by_peer: false, // never expose to client that peer blocked you
      plan,
      has_unlimited_chat: unlimited,
      unlocked,
      can_message: canMessage,
      can_unlock: canUnlock,
      chat_unlock_cost: CHAT_UNLOCK_COST,
      chat_slots_used: slotsUsed,
      chat_slots_max: unlimited ? null : FREE_CHAT_UNLOCK_MAX,
      my_points_balance: myBalance,
      peer_points_balance: peerBalance,
      peer_has_enough_points: true,
      reason,
    };
  }

  async unlockChat(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new AppError("Cannot unlock chat with yourself", 400);
    }

    const peer = await this.userRepository.findById(otherUserId);
    if (!peer) throw new AppError("User not found", 404);

    if (await isEitherBlocked(userId, otherUserId)) {
      throw new AppError("Cannot unlock chat with this user", 403);
    }

    const connected = await this.followRepository.checkMutualFollow(
      userId,
      otherUserId
    );
    if (!connected) {
      throw new AppError("Can only unlock chat with connections", 403);
    }

    const user = await this.premiumService.ensurePlansActive(userId);
    if (this.premiumService.effectivePlan(user) !== "free") {
      return {
        ...(await this.getChatAccess(userId, otherUserId)),
        unlocked: true,
        already_unlocked: true,
        points_spent: 0,
      };
    }

    const existing = await this.chatUnlockRepository.findPair(
      userId,
      otherUserId
    );
    if (existing) {
      const access = await this.getChatAccess(userId, otherUserId);
      emitChatUnlocked(otherUserId, {
        peer_id: userId,
        unlocked_by: existing.unlocked_by,
      });
      return {
        ...access,
        unlocked: true,
        already_unlocked: true,
        points_spent: 0,
        can_message: true,
      };
    }

    const slotsUsed =
      await this.chatUnlockRepository.countUnlockedBy(userId);
    if (slotsUsed >= FREE_CHAT_UNLOCK_MAX) {
      throw new AppError(
        `Free plan allows chatting with at most ${FREE_CHAT_UNLOCK_MAX} people. Upgrade to Basic for unlimited chat.`,
        403,
        true,
        "CHAT_SLOT_LIMIT"
      );
    }

    const myBalance = (await this.pointsService.getBalance(userId)).balance;
    if (myBalance < CHAT_UNLOCK_COST) {
      throw new AppError(
        `You need ${CHAT_UNLOCK_COST} points to unlock chat`,
        402,
        true,
        "INSUFFICIENT_POINTS"
      );
    }

    const { user_a, user_b } = normalizeChatPair(userId, otherUserId);
    const referenceId = `chat_unlock:${user_a}:${user_b}`;

    await this.pointsService.spendPoints(
      userId,
      CHAT_UNLOCK_COST,
      PointTypes.CHAT_UNLOCK_SPENT,
      referenceId,
      "Chat unlock"
    );

    await this.chatUnlockRepository.createUnlock({
      userId1: userId,
      userId2: otherUserId,
      unlockedBy: userId,
      pointsSpent: CHAT_UNLOCK_COST,
    });

    // Notify peer so their chat composer unlocks without a reload.
    emitChatUnlocked(otherUserId, {
      peer_id: userId,
      unlocked_by: userId,
    });

    return {
      ...(await this.getChatAccess(userId, otherUserId)),
      unlocked: true,
      already_unlocked: false,
      points_spent: CHAT_UNLOCK_COST,
      can_message: true,
    };
  }

  private async assertCanMessage(senderId: string, receiverId: string) {
    if (await isEitherBlocked(senderId, receiverId)) {
      // Generic — never say "blocked" so the blocked user isn't tipped off.
      throw new AppError("Couldn't send message", 403, true, "MESSAGE_UNAVAILABLE");
    }

    const areMutualFollowers = await this.followRepository.checkMutualFollow(
      senderId,
      receiverId
    );

    if (!areMutualFollowers) {
      throw new AppError("Can only message users you are connected with", 403);
    }

    const sender = await this.premiumService.ensurePlansActive(senderId);
    if (this.premiumService.effectivePlan(sender) !== "free") {
      return;
    }

    const unlocked = await this.chatUnlockRepository.isUnlocked(
      senderId,
      receiverId
    );
    if (!unlocked) {
      throw new AppError(
        `Chat is locked. Spend ${CHAT_UNLOCK_COST} points to unlock this conversation, or upgrade to Basic.`,
        403,
        true,
        "CHAT_LOCKED"
      );
    }
  }

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    replyToMessageId?: string | null,
    opts?: {
      messageType?: MessageType;
      mediaUrl?: string | null;
      durationMs?: number | null;
    }
  ) {
    await this.assertCanMessage(senderId, receiverId);

    const messageType = opts?.messageType ?? MessageType.TEXT;
    const trimmed = (content ?? "").trim();
    if (messageType === MessageType.TEXT && !trimmed) {
      throw new AppError("Message content is required", 400);
    }
    if (messageType === MessageType.VOICE && !opts?.mediaUrl) {
      throw new AppError("Voice media is required", 400);
    }

    let replyPreview: {
      id: string;
      content: string;
      sender_id: string;
    } | null = null;

    if (replyToMessageId) {
      const parent = await this.messageRepository.findById(replyToMessageId);
      if (!parent) {
        throw new AppError("Reply target message not found", 404);
      }
      const sameThread =
        (parent.sender_id === senderId && parent.receiver_id === receiverId) ||
        (parent.sender_id === receiverId && parent.receiver_id === senderId);
      if (!sameThread) {
        throw new AppError("Can only reply to messages in this conversation", 400);
      }
      replyPreview = {
        id: parent.id,
        content:
          parent.message_type === MessageType.VOICE
            ? "Voice message"
            : parent.content,
        sender_id: parent.sender_id,
      };
    }

    const message = await this.messageRepository.create(
      senderId,
      receiverId,
      messageType === MessageType.VOICE ? "" : trimmed,
      replyToMessageId ?? null,
      {
        messageType,
        mediaUrl: opts?.mediaUrl ?? null,
        durationMs: opts?.durationMs ?? null,
      }
    );

    return this.formatMessagePayload(message, replyPreview);
  }

  async sendVoiceMessage(
    senderId: string,
    receiverId: string,
    mediaUrl: string,
    durationMs?: number | null,
    replyToMessageId?: string | null
  ) {
    return this.sendMessage(senderId, receiverId, "", replyToMessageId, {
      messageType: MessageType.VOICE,
      mediaUrl,
      durationMs: durationMs ?? null,
    });
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const trimmed = (content ?? "").trim();
    if (!trimmed) {
      throw new AppError("Message content is required", 400);
    }
    if (trimmed.length > 5000) {
      throw new AppError("Message must not exceed 5000 characters", 400);
    }

    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }
    if (message.sender_id !== userId) {
      throw new AppError("Only the sender can edit this message", 403);
    }
    if (message.deleted_at) {
      throw new AppError("Cannot edit a deleted message", 400);
    }
    if (message.message_type !== MessageType.TEXT) {
      throw new AppError("Only text messages can be edited", 400);
    }

    await this.assertCanMessage(userId, message.receiver_id);

    const updated = await this.messageRepository.updateContent(messageId, trimmed);
    if (!updated) {
      throw new AppError("Message not found", 404);
    }

    return {
      ...this.formatMessagePayload(updated, null),
      edited_at: updated.edited_at,
      sender_id: updated.sender_id,
      receiver_id: updated.receiver_id,
    };
  }

  private formatMessagePayload(
    message: Message,
    replyPreview: {
      id: string;
      content: string;
      sender_id: string;
    } | null
  ) {
    const sender = message.sender;
    return {
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      message_type: message.message_type ?? MessageType.TEXT,
      media_url: message.media_url,
      duration_ms: message.duration_ms,
      is_read: message.is_read,
      created_at: message.created_at,
      edited_at: message.edited_at,
      reply_to_message_id: message.reply_to_message_id,
      reply_to: replyPreview,
      sender: {
        full_name: sender?.full_name ?? "",
        profile_picture: sender?.profile_picture ?? null,
      },
    };
  }

  async getChatHistory(
    userId: string,
    otherUserId: string,
    query: PaginationQuery
  ) {
    const areMutualFollowers = await this.followRepository.checkMutualFollow(
      userId,
      otherUserId
    );

    if (!areMutualFollowers) {
      throw new AppError(
        "Can only view messages from users you are connected with",
        403
      );
    }

    const user = await this.premiumService.ensurePlansActive(userId);
    if (this.premiumService.effectivePlan(user) === "free") {
      const unlocked = await this.chatUnlockRepository.isUnlocked(
        userId,
        otherUserId
      );
      if (!unlocked) {
        throw new AppError(
          `Chat is locked. Spend ${CHAT_UNLOCK_COST} points to unlock this conversation, or upgrade to Basic.`,
          403,
          true,
          "CHAT_LOCKED"
        );
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const { messages, total } = await this.messageRepository.getChatHistory(
      userId,
      otherUserId,
      page,
      limit
    );

    const items = messages.map((message) => {
      const deletedForEveryone = !!message.deleted_at;
      return {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: deletedForEveryone ? "" : message.content,
        message_type: message.message_type ?? MessageType.TEXT,
        media_url: deletedForEveryone ? null : message.media_url,
        duration_ms: deletedForEveryone ? null : message.duration_ms,
        is_read: message.is_read,
        read_at: message.read_at,
        created_at: message.created_at,
        edited_at: message.edited_at,
        deleted_for_everyone: deletedForEveryone,
        deleted_at: message.deleted_at,
        reply_to_message_id: message.reply_to_message_id,
        reply_to:
          message.reply_to && !message.reply_to.deleted_at
            ? {
                id: message.reply_to.id,
                content:
                  message.reply_to.message_type === MessageType.VOICE
                    ? "Voice message"
                    : message.reply_to.content,
                sender_id: message.reply_to.sender_id,
              }
            : message.reply_to
              ? {
                  id: message.reply_to.id,
                  content: "",
                  sender_id: message.reply_to.sender_id,
                  deleted_for_everyone: true,
                }
              : null,
        sender: {
          full_name: message.sender.full_name,
          profile_picture: message.sender.profile_picture,
        },
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new AppError("Message not found", 404);
    }

    if (message.receiver_id !== userId) {
      throw new AppError("Not authorized to mark this message as read", 403);
    }

    const updatedMessage = await this.messageRepository.markAsRead(messageId);

    return {
      id: updatedMessage!.id,
      is_read: updatedMessage!.is_read,
      read_at: updatedMessage!.read_at,
      sender_id: updatedMessage!.sender_id,
    };
  }

  async markAllAsRead(userId: string, otherUserId: string) {
    await this.messageRepository.markAllAsRead(otherUserId, userId);
    return { message: "All messages marked as read" };
  }

  async getUnreadCount(userId: string, fromUserId?: string) {
    return await this.messageRepository.getUnreadCount(userId, fromUserId);
  }

  async getConversations(userId: string) {
    const conversations = await this.messageRepository.getConversations(userId);

    return conversations.map((conv) => ({
      user: {
        id: conv.user_id,
        full_name: conv.full_name,
        profile_picture: conv.profile_picture,
        is_online: conv.is_online,
        last_seen: conv.last_seen,
      },
      last_message: conv.last_message_deleted_at
        ? {
            content: "Message deleted",
            created_at: conv.last_message_time,
            is_read: conv.last_message_is_read,
            is_sent_by_me: conv.last_message_sender_id === userId,
            deleted_for_everyone: true,
          }
        : conv.last_message_content
          ? {
              content: conv.last_message_content,
              created_at: conv.last_message_time,
              is_read: conv.last_message_is_read,
              is_sent_by_me: conv.last_message_sender_id === userId,
            }
          : null,
      unread_count: parseInt(conv.unread_count),
    }));
  }

  async deleteMessage(
    userId: string,
    messageId: string,
    scope: "me" | "everyone"
  ) {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    const isParticipant =
      message.sender_id === userId || message.receiver_id === userId;
    if (!isParticipant) {
      throw new AppError("Not authorized to delete this message", 403);
    }

    if (scope === "everyone") {
      if (message.sender_id !== userId) {
        throw new AppError("Only the sender can delete for everyone", 403);
      }
      if (message.deleted_at) {
        return {
          id: message.id,
          scope: "everyone" as const,
          deleted_at: message.deleted_at,
          already_deleted: true,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
        };
      }
      const updated = await this.messageRepository.softDeleteForEveryone(
        messageId,
        userId
      );
      return {
        id: messageId,
        scope: "everyone" as const,
        deleted_at: updated!.deleted_at,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
      };
    }

    // delete for me
    await this.messageRepository.hideForUser(messageId, userId);
    return {
      id: messageId,
      scope: "me" as const,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
    };
  }

  async deleteConversation(userId: string, otherUserId: string) {
    await this.messageRepository.deleteConversation(userId, otherUserId);
    return { message: "Conversation deleted successfully" };
  }
}
