import { Server } from "socket.io";
import {
  PRESENCE_OFFLINE_DEBOUNCE_MS,
  resetSocketPresenceStateForTests,
  SocketHandler,
} from "../socket/socket.handler";
import { MessageService } from "../services/message.service";
import { UserService } from "../services/user.service";
import { NotificationService } from "../services/notification.service";
import { AuthenticatedSocket } from "../middleware/socket.middleware";

type HandlerMap = Record<string, Array<(data?: unknown) => unknown>>;

function createMockSocket(userId: string, socketId: string) {
  const handlers: HandlerMap = {};
  const socket = {
    id: socketId,
    user: { id: userId, email: `${userId}@test.com` },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, cb: (data?: unknown) => unknown) => {
      (handlers[event] ??= []).push(cb);
    }),
    async trigger(event: string, data?: unknown) {
      for (const cb of handlers[event] ?? []) {
        await cb(data);
      }
    },
  };
  return socket as typeof socket & AuthenticatedSocket;
}

describe("SocketHandler events", () => {
  const roomEmit = jest.fn();
  let io: jest.Mocked<Pick<Server, "to" | "emit">>;
  let messageService: jest.Mocked<Pick<MessageService, "sendMessage" | "markMessageAsRead">>;
  let userService: jest.Mocked<Pick<UserService, "updateOnlineStatus" | "getUserById">>;
  let notificationService: jest.Mocked<Pick<NotificationService, "notifyNewMessage">>;
  let handler: SocketHandler;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetSocketPresenceStateForTests();

    io = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
      emit: jest.fn(),
    };

    messageService = {
      sendMessage: jest.fn(),
      markMessageAsRead: jest.fn(),
    };

    userService = {
      updateOnlineStatus: jest.fn().mockResolvedValue(undefined),
      getUserById: jest.fn(),
    };

    notificationService = {
      notifyNewMessage: jest.fn().mockResolvedValue(undefined),
    };

    handler = new SocketHandler(io as unknown as Server, {
      messageService: messageService as unknown as MessageService,
      userService: userService as unknown as UserService,
      notificationService: notificationService as unknown as NotificationService,
    });
  });

  afterEach(() => {
    resetSocketPresenceStateForTests();
    jest.useRealTimers();
  });

  it("broadcasts online on first connection and joins user room", () => {
    const socket = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith("user:user-a");
    expect(userService.updateOnlineStatus).toHaveBeenCalledWith("user-a", true);
    expect(io.emit).toHaveBeenCalledWith(
      "user_status_changed",
      expect.objectContaining({ user_id: "user-a", is_online: true })
    );
  });

  it("does not re-broadcast online when a second device connects", () => {
    const first = createMockSocket("user-a", "sock-a1");
    const second = createMockSocket("user-a", "sock-a2");
    handler.handleConnection(first);
    jest.clearAllMocks();
    handler.handleConnection(second);

    expect(userService.updateOnlineStatus).not.toHaveBeenCalled();
    expect(io.emit).not.toHaveBeenCalled();
  });

  it("emits message_sent and new_message when peer is online", async () => {
    const sender = createMockSocket("user-a", "sock-a1");
    const receiver = createMockSocket("user-b", "sock-b1");
    handler.handleConnection(sender);
    handler.handleConnection(receiver);

    const saved = {
      id: "msg-1",
      sender_id: "user-a",
      receiver_id: "user-b",
      content: "hello",
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      reply_to_message_id: null,
      reply_to: null,
      sender: { id: "user-a", full_name: "Alex" },
    };
    messageService.sendMessage.mockResolvedValue(saved as never);

    await sender.trigger("send_message", {
      receiver_id: "user-b",
      content: "hello",
      client_message_id: "local-1",
    });

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      "user-a",
      "user-b",
      "hello",
      undefined
    );
    expect(sender.emit).toHaveBeenCalledWith(
      "message_sent",
      expect.objectContaining({
        success: true,
        client_message_id: "local-1",
        message: saved,
      })
    );
    expect(io.to).toHaveBeenCalledWith("sock-b1");
    expect(roomEmit).toHaveBeenCalledWith(
      "new_message",
      expect.objectContaining({
        id: "msg-1",
        content: "hello",
        sender_id: "user-a",
        receiver_id: "user-b",
      })
    );
    expect(notificationService.notifyNewMessage).toHaveBeenCalled();
  });

  it("skips message notification when receiver has that chat open", async () => {
    const sender = createMockSocket("user-a", "sock-a1");
    const receiver = createMockSocket("user-b", "sock-b1");
    handler.handleConnection(sender);
    handler.handleConnection(receiver);
    await receiver.trigger("chat_open", { peer_id: "user-a" });
    notificationService.notifyNewMessage.mockClear();
    roomEmit.mockClear();

    messageService.sendMessage.mockResolvedValue({
      id: "msg-live",
      sender_id: "user-a",
      receiver_id: "user-b",
      content: "live",
      message_type: "text",
      created_at: new Date(),
      sender: { id: "user-a", full_name: "Alex" },
    } as never);

    await sender.trigger("send_message", {
      receiver_id: "user-b",
      content: "live",
      client_message_id: "local-live",
    });

    expect(roomEmit).toHaveBeenCalledWith(
      "new_message",
      expect.objectContaining({ id: "msg-live" })
    );
    expect(notificationService.notifyNewMessage).not.toHaveBeenCalled();
  });

  it("still emits message_sent when receiver is offline", async () => {
    const sender = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(sender);
    roomEmit.mockClear();
    (io.to as jest.Mock).mockClear();

    messageService.sendMessage.mockResolvedValue({
      id: "msg-2",
      sender_id: "user-a",
      receiver_id: "user-b",
      content: "offline ping",
      created_at: new Date(),
      sender: { id: "user-a", full_name: "Alex" },
    } as never);

    await sender.trigger("send_message", {
      receiver_id: "user-b",
      content: "offline ping",
      client_message_id: "local-2",
    });

    expect(sender.emit).toHaveBeenCalledWith(
      "message_sent",
      expect.objectContaining({ success: true, client_message_id: "local-2" })
    );
    expect(roomEmit).not.toHaveBeenCalledWith(
      "new_message",
      expect.anything()
    );
  });

  it("emits message_error when sendMessage fails", async () => {
    const sender = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(sender);
    messageService.sendMessage.mockRejectedValue(new Error("Chat locked"));

    await sender.trigger("send_message", {
      receiver_id: "user-b",
      content: "nope",
      client_message_id: "local-err",
    });

    expect(sender.emit).toHaveBeenCalledWith(
      "message_error",
      expect.objectContaining({
        success: false,
        error: "Chat locked",
        client_message_id: "local-err",
      })
    );
  });

  it("forwards typing_start and typing_stop to the peer", async () => {
    const sender = createMockSocket("user-a", "sock-a1");
    const receiver = createMockSocket("user-b", "sock-b1");
    handler.handleConnection(sender);
    handler.handleConnection(receiver);
    roomEmit.mockClear();

    await sender.trigger("typing_start", { receiver_id: "user-b" });
    expect(roomEmit).toHaveBeenCalledWith("user_typing", {
      user_id: "user-a",
      is_typing: true,
    });

    roomEmit.mockClear();
    await sender.trigger("typing_stop", { receiver_id: "user-b" });
    expect(roomEmit).toHaveBeenCalledWith("user_typing", {
      user_id: "user-a",
      is_typing: false,
    });
  });

  it("emits message_read to the original sender", async () => {
    const reader = createMockSocket("user-b", "sock-b1");
    const originalSender = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(reader);
    handler.handleConnection(originalSender);
    roomEmit.mockClear();

    messageService.markMessageAsRead.mockResolvedValue({
      id: "msg-9",
      sender_id: "user-a",
      read_at: new Date("2026-01-02T00:00:00.000Z"),
    } as never);

    await reader.trigger("mark_as_read", { message_id: "msg-9" });

    expect(messageService.markMessageAsRead).toHaveBeenCalledWith(
      "msg-9",
      "user-b"
    );
    expect(roomEmit).toHaveBeenCalledWith(
      "message_read",
      expect.objectContaining({ message_id: "msg-9" })
    );
  });

  it("returns live online status via get_user_status and subscribe_user_status", async () => {
    const watcher = createMockSocket("user-a", "sock-a1");
    const peer = createMockSocket("user-b", "sock-b1");
    handler.handleConnection(watcher);
    handler.handleConnection(peer);

    await watcher.trigger("get_user_status", { user_id: "user-b" });
    expect(watcher.emit).toHaveBeenCalledWith(
      "user_status_initial",
      expect.objectContaining({ user_id: "user-b", is_online: true })
    );

    await watcher.trigger("subscribe_user_status", { user_id: "user-b" });
    expect(watcher.join).toHaveBeenCalledWith("status:user-b");
    expect(watcher.emit).toHaveBeenCalledWith(
      "user_status_initial",
      expect.objectContaining({ user_id: "user-b", is_online: true })
    );
  });

  it("returns offline + last_seen when peer is not connected", async () => {
    const watcher = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(watcher);
    const lastSeen = new Date("2026-01-03T12:00:00.000Z");
    userService.getUserById.mockResolvedValue({
      id: "user-b",
      last_seen: lastSeen,
    } as never);

    await watcher.trigger("get_user_status", { user_id: "user-b" });

    expect(watcher.emit).toHaveBeenCalledWith("user_status_initial", {
      user_id: "user-b",
      is_online: false,
      last_seen: lastSeen,
    });
  });

  it("debounces offline broadcast and cancels it on quick reconnect", async () => {
    const socket = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(socket);
    jest.clearAllMocks();

    await socket.trigger("disconnect");
    expect(userService.updateOnlineStatus).not.toHaveBeenCalledWith(
      "user-a",
      false
    );

    // Reconnect before debounce elapses.
    const reconnected = createMockSocket("user-a", "sock-a2");
    handler.handleConnection(reconnected);
    jest.advanceTimersByTime(PRESENCE_OFFLINE_DEBOUNCE_MS + 50);

    expect(userService.updateOnlineStatus).not.toHaveBeenCalledWith(
      "user-a",
      false
    );
    expect(handler.isUserOnline("user-a")).toBe(true);
  });

  it("broadcasts offline after debounce when user stays disconnected", async () => {
    const socket = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(socket);
    jest.clearAllMocks();

    await socket.trigger("disconnect");
    jest.advanceTimersByTime(PRESENCE_OFFLINE_DEBOUNCE_MS + 10);

    expect(userService.updateOnlineStatus).toHaveBeenCalledWith("user-a", false);
    expect(io.emit).toHaveBeenCalledWith(
      "user_status_changed",
      expect.objectContaining({ user_id: "user-a", is_online: false })
    );
    expect(handler.isUserOnline("user-a")).toBe(false);
  });

  it("leaves status room on unsubscribe_user_status", async () => {
    const watcher = createMockSocket("user-a", "sock-a1");
    handler.handleConnection(watcher);
    await watcher.trigger("unsubscribe_user_status", { user_id: "user-b" });
    expect(watcher.leave).toHaveBeenCalledWith("status:user-b");
  });
});
