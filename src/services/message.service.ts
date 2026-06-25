import { MessageRepository } from "../repositories/message.repository";
import { FollowRepository } from "../repositories/follow.repository";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import { PaginationQuery } from "../types";

export class MessageService {
  private messageRepository: MessageRepository;
  private followRepository: FollowRepository;
  private userRepository: UserRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
    this.followRepository = new FollowRepository();
    this.userRepository = new UserRepository();
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    // Check if users are mutually following
    const areMutualFollowers = await this.followRepository.checkMutualFollow(
      senderId,
      receiverId
    );

    if (!areMutualFollowers) {
      throw new AppError("Can only message users you mutually follow", 403);
    }

    // Create message
    const message = await this.messageRepository.create(
      senderId,
      receiverId,
      content
    );

    // Get sender info for response
    const sender = await this.userRepository.findById(senderId);

    return {
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      is_read: message.is_read,
      created_at: message.created_at,
      sender: {
        full_name: sender!.full_name,
        profile_picture: sender!.profile_picture,
      },
    };
  }

  async getChatHistory(
    userId: string,
    otherUserId: string,
    query: PaginationQuery
  ) {
    // Check if users are mutually following
    const areMutualFollowers = await this.followRepository.checkMutualFollow(
      userId,
      otherUserId
    );

    if (!areMutualFollowers) {
      throw new AppError(
        "Can only view messages from users you mutually follow",
        403
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const { messages, total } = await this.messageRepository.getChatHistory(
      userId,
      otherUserId,
      page,
      limit
    );

    const items = messages.map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      is_read: message.is_read,
      read_at: message.read_at,
      created_at: message.created_at,
      sender: {
        full_name: message.sender.full_name,
        profile_picture: message.sender.profile_picture,
      },
    }));

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

    // Check if user is the receiver
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
      last_message: conv.last_message_content
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

  async deleteConversation(userId: string, otherUserId: string) {
    await this.messageRepository.deleteConversation(userId, otherUserId);
    return { message: "Conversation deleted successfully" };
  }
}
