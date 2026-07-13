import { Server } from "socket.io";
import { MessageService } from "../services/message.service";
import { UserService } from "../services/user.service";
import {
  SendMessageEvent,
  TypingEvent,
  MarkAsReadEvent,
  NewMessageEvent,
} from "../types";
import { AuthenticatedSocket } from "../middleware/socket.middleware";
import { NotificationService } from "../services/notification.service";
import { userRoom } from "../services/socket-event.service";

// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();

export class SocketHandler {
  private io: Server;
  private messageService: MessageService;
  private userService: UserService;
  private notificationService: NotificationService;

  constructor(io: Server) {
    this.io = io;
    this.messageService = new MessageService();
    this.userService = new UserService();
    this.notificationService = new NotificationService();
  }

  handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user!.id;
    console.log(`User connected: ${userId} - ${socket.user!.email}`);

    // Store user's socket ID
    onlineUsers.set(userId, socket.id);

    // Join personal room for targeted real-time events
    socket.join(userRoom(userId));

    // Update user's online status
    this.userService.updateOnlineStatus(userId, true).catch(console.error);

    // Notify user's connections that they're online
    this.broadcastOnlineStatus(userId, true);

    // Set up event handlers
    this.handleSendMessage(socket);
    this.handleTyping(socket);
    this.handleMarkAsRead(socket);
    this.handlePresence(socket);
    this.handleDisconnect(socket);
  }

  private handleSendMessage(socket: AuthenticatedSocket): void {
    socket.on("send_message", async (data: SendMessageEvent) => {
      try {
        const senderId = socket.user!.id;
        const { receiver_id, content } = data;

        // Save message to database
        const message = await this.messageService.sendMessage(
          senderId,
          receiver_id,
          content
        );

        // Check if receiver is online
        const receiverSocketId = onlineUsers.get(receiver_id);
        if (receiverSocketId) {
          const newMessageEvent: NewMessageEvent = {
            id: message.id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            content: message.content,
            created_at: message.created_at,
            sender: message.sender,
          };
          this.io.to(receiverSocketId).emit("new_message", newMessageEvent);
          this.notificationService
            .notifyNewMessage(receiver_id, message.sender.full_name, content)
            .catch(console.error);
        } else {
          // Receiver is offline - send push notification
          this.notificationService
            .notifyNewMessage(receiver_id, message.sender.full_name, content)
            .catch(console.error);
        }

        // Confirm to sender
        socket.emit("message_sent", { success: true, message });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send message",
        });
      }
    });
  }

  private handleTyping(socket: AuthenticatedSocket): void {
    socket.on("typing_start", (data: TypingEvent) => {
      const senderId = socket.user!.id;
      const { receiver_id } = data;

      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit("user_typing", {
          user_id: senderId,
          is_typing: true,
        });
      }
    });

    socket.on("typing_stop", (data: TypingEvent) => {
      const senderId = socket.user!.id;
      const { receiver_id } = data;

      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit("user_typing", {
          user_id: senderId,
          is_typing: false,
        });
      }
    });
  }

  private handleMarkAsRead(socket: AuthenticatedSocket): void {
    socket.on("mark_as_read", async (data: MarkAsReadEvent) => {
      try {
        const userId = socket.user!.id;
        const { message_id } = data;

        const message = await this.messageService.markMessageAsRead(
          message_id,
          userId
        );

        // Notify sender that message was read
        const senderSocketId = onlineUsers.get(message.sender_id);
        if (senderSocketId) {
          this.io.to(senderSocketId).emit("message_read", {
            message_id: message.id,
            read_at: message.read_at,
          });
        }
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    socket.on("disconnect", async () => {
      const userId = socket.user!.id;
      console.log(`User disconnected: ${userId}`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Update user's online status
      await this.userService.updateOnlineStatus(userId, false);

      // Notify user's connections that they're offline
      this.broadcastOnlineStatus(userId, false);
    });
  }

  private broadcastOnlineStatus(userId: string, isOnline: boolean): void {
    // In a production app, fetch the user's connections and notify them
    // For now, we'll broadcast to all connected users
    this.io.emit("user_status_changed", {
      user_id: userId,
      is_online: isOnline,
      last_seen: isOnline ? null : new Date(),
    });
  }

  private handlePresence(socket: AuthenticatedSocket): void {
    // Handle get_user_status - single user status request
    socket.on("get_user_status", async (data: { user_id: string }) => {
      try {
        const { user_id } = data;
        const isOnline = this.isUserOnline(user_id);

        let lastSeen = null;
        if (!isOnline) {
          // Fetch last_seen from database for offline users
          const user = await this.userService.getUserById(user_id);
          lastSeen = user?.last_seen || null;
        }

        socket.emit("user_status_initial", {
          user_id,
          is_online: isOnline,
          last_seen: lastSeen,
        });
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    });

    // Handle subscribe_user_status - subscribe to status updates
    socket.on("subscribe_user_status", async (data: { user_id: string }) => {
      try {
        const { user_id } = data;
        const isOnline = this.isUserOnline(user_id);

        let lastSeen = null;
        if (!isOnline) {
          const user = await this.userService.getUserById(user_id);
          lastSeen = user?.last_seen || null;
        }

        // Send initial status immediately
        socket.emit("user_status_initial", {
          user_id,
          is_online: isOnline,
          last_seen: lastSeen,
        });

        // Optionally: Add socket to a room for targeted updates
        socket.join(`status:${user_id}`);
      } catch (error) {
        console.error("Error subscribing to user status:", error);
      }
    });

    // Handle unsubscribe
    socket.on("unsubscribe_user_status", (data: { user_id: string }) => {
      const { user_id } = data;
      socket.leave(`status:${user_id}`);
    });
  }

  // Method to get online users (useful for debugging)
  getOnlineUsers(): Map<string, string> {
    return onlineUsers;
  }

  // Method to check if user is online
  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }
}
