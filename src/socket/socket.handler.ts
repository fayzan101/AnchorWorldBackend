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

/** userId -> set of active socket ids (supports multi-device). */
const onlineUsers = new Map<string, Set<string>>();
const offlineTimers = new Map<string, NodeJS.Timeout>();
/** socketId -> peer user id currently open in ChatScreen */
const activeChatBySocket = new Map<string, string>();

/** Debounce so brief reconnects don't flicker Offline. Exported for tests. */
export const PRESENCE_OFFLINE_DEBOUNCE_MS = 1500;

/** Clear in-memory presence maps between unit tests. */
export function resetSocketPresenceStateForTests(): void {
  for (const timer of offlineTimers.values()) {
    clearTimeout(timer);
  }
  offlineTimers.clear();
  onlineUsers.clear();
  activeChatBySocket.clear();
}

/**
 * True when receiver currently has the chat with peerId open
 * (so message notifications should be suppressed).
 */
export function isUserViewingChatWith(
  userId: string,
  peerId: string
): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets || sockets.size === 0) return false;
  for (const sid of sockets) {
    if (activeChatBySocket.get(sid) === peerId) return true;
  }
  return false;
}

export class SocketHandler {
  private io: Server;
  private messageService: MessageService;
  private userService: UserService;
  private notificationService: NotificationService;

  constructor(
    io: Server,
    deps?: {
      messageService?: MessageService;
      userService?: UserService;
      notificationService?: NotificationService;
    }
  ) {
    this.io = io;
    this.messageService = deps?.messageService ?? new MessageService();
    this.userService = deps?.userService ?? new UserService();
    this.notificationService =
      deps?.notificationService ?? new NotificationService();
  }

  handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user!.id;
    console.log(`User connected: ${userId} - ${socket.user!.email}`);

    const pendingOffline = offlineTimers.get(userId);
    if (pendingOffline) {
      clearTimeout(pendingOffline);
      offlineTimers.delete(userId);
    }

    let sockets = onlineUsers.get(userId);
    const becameOnline = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set();
      onlineUsers.set(userId, sockets);
    }
    sockets.add(socket.id);

    socket.join(userRoom(userId));

    if (becameOnline) {
      this.userService.updateOnlineStatus(userId, true).catch(console.error);
      this.broadcastOnlineStatus(userId, true);
    }

    this.handleSendMessage(socket);
    this.handleTyping(socket);
    this.handleMarkAsRead(socket);
    this.handleChatActivity(socket);
    this.handlePresence(socket);
    this.handleDisconnect(socket);
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      this.io.to(sid).emit(event, payload);
    }
  }

  private handleSendMessage(socket: AuthenticatedSocket): void {
    socket.on("send_message", async (data: SendMessageEvent) => {
      const clientMessageId = data.client_message_id || data.message_id;
      try {
        const senderId = socket.user!.id;
        const { receiver_id, content, reply_to_message_id } = data;

        const message = await this.messageService.sendMessage(
          senderId,
          receiver_id,
          content,
          reply_to_message_id
        );

        const newMessageEvent: NewMessageEvent = {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          created_at: message.created_at,
          message_type: message.message_type,
          media_url: message.media_url,
          duration_ms: message.duration_ms,
          edited_at: message.edited_at,
          reply_to_message_id: message.reply_to_message_id,
          reply_to: message.reply_to,
          sender: message.sender,
        };

        if (this.isUserOnline(receiver_id)) {
          this.emitToUser(receiver_id, "new_message", newMessageEvent);
        }

        // Skip inbox/push while the receiver is actively in this chat.
        if (!isUserViewingChatWith(receiver_id, senderId)) {
          const preview =
            message.message_type === "voice"
              ? "Voice message"
              : content;
          this.notificationService
            .notifyNewMessage(
              receiver_id,
              message.sender.full_name,
              preview,
              message.sender_id
            )
            .catch(console.error);
        }

        socket.emit("message_sent", {
          success: true,
          message,
          client_message_id: clientMessageId ?? null,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        const appErr = error as { message?: string; code?: string };
        socket.emit("message_error", {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send message",
          code: appErr?.code ?? null,
          client_message_id: clientMessageId ?? null,
        });
      }
    });
  }

  private handleTyping(socket: AuthenticatedSocket): void {
    socket.on("typing_start", (data: TypingEvent) => {
      const senderId = socket.user!.id;
      const { receiver_id } = data;
      this.emitToUser(receiver_id, "user_typing", {
        user_id: senderId,
        is_typing: true,
      });
    });

    socket.on("typing_stop", (data: TypingEvent) => {
      const senderId = socket.user!.id;
      const { receiver_id } = data;
      this.emitToUser(receiver_id, "user_typing", {
        user_id: senderId,
        is_typing: false,
      });
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

        this.emitToUser(message.sender_id, "message_read", {
          message_id: message.id,
          read_at: message.read_at,
        });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });
  }

  private handleChatActivity(socket: AuthenticatedSocket): void {
    socket.on("chat_open", (data: { peer_id?: string; peerId?: string }) => {
      const peerId = (data?.peer_id || data?.peerId || "").toString().trim();
      if (!peerId) return;
      activeChatBySocket.set(socket.id, peerId);
    });

    socket.on("chat_close", (data?: { peer_id?: string; peerId?: string }) => {
      const peerId = (data?.peer_id || data?.peerId || "").toString().trim();
      const current = activeChatBySocket.get(socket.id);
      if (!peerId || current === peerId) {
        activeChatBySocket.delete(socket.id);
      }
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    socket.on("disconnect", () => {
      const userId = socket.user!.id;
      console.log(`User disconnected: ${userId}`);
      activeChatBySocket.delete(socket.id);

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          const existing = offlineTimers.get(userId);
          if (existing) clearTimeout(existing);
          // Debounce offline so brief reconnects don't flicker status.
          const timer = setTimeout(() => {
            offlineTimers.delete(userId);
            if (this.isUserOnline(userId)) return;
            this.userService
              .updateOnlineStatus(userId, false)
              .catch(console.error);
            this.broadcastOnlineStatus(userId, false);
          }, PRESENCE_OFFLINE_DEBOUNCE_MS);
          offlineTimers.set(userId, timer);
        }
      }
    });
  }

  private broadcastOnlineStatus(userId: string, isOnline: boolean): void {
    const payload = {
      user_id: userId,
      is_online: isOnline,
      last_seen: isOnline ? null : new Date(),
    };
    // Targeted subscribers (chat presence) + global for lists.
    this.io.to(`status:${userId}`).emit("user_status_changed", payload);
    this.io.emit("user_status_changed", payload);
  }

  private handlePresence(socket: AuthenticatedSocket): void {
    socket.on("get_user_status", async (data: { user_id: string }) => {
      try {
        const { user_id } = data;
        const isOnline = this.isUserOnline(user_id);

        let lastSeen = null;
        if (!isOnline) {
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

    socket.on("subscribe_user_status", async (data: { user_id: string }) => {
      try {
        const { user_id } = data;
        const isOnline = this.isUserOnline(user_id);

        let lastSeen = null;
        if (!isOnline) {
          const user = await this.userService.getUserById(user_id);
          lastSeen = user?.last_seen || null;
        }

        socket.emit("user_status_initial", {
          user_id,
          is_online: isOnline,
          last_seen: lastSeen,
        });

        socket.join(`status:${user_id}`);
      } catch (error) {
        console.error("Error subscribing to user status:", error);
      }
    });

    socket.on("unsubscribe_user_status", (data: { user_id: string }) => {
      const { user_id } = data;
      socket.leave(`status:${user_id}`);
    });
  }

  getOnlineUsers(): Map<string, Set<string>> {
    return onlineUsers;
  }

  isUserOnline(userId: string): boolean {
    const sockets = onlineUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
