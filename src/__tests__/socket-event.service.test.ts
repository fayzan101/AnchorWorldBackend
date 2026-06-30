import { Server } from "socket.io";
import {
  emitPointsUpdated,
  emitPostLiked,
  emitToUser,
  setSocketServer,
  userRoom,
} from "../services/socket-event.service";

describe("socket-event.service", () => {
  const emit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setSocketServer({
      to: jest.fn().mockReturnValue({ emit }),
    } as unknown as Server);
  });

  it("builds user room names", () => {
    expect(userRoom("user-123")).toBe("user:user-123");
  });

  it("emits events to user room", () => {
    emitPostLiked("owner-1", {
      post_id: "post-1",
      user_id: "liker-1",
      user_name: "Alex",
    });

    expect(emit).toHaveBeenCalledWith("post_liked", {
      post_id: "post-1",
      user_id: "liker-1",
      user_name: "Alex",
    });
  });

  it("emits points_updated with balance", () => {
    emitPointsUpdated("user-1", { balance: 500 });

    expect(emit).toHaveBeenCalledWith("points_updated", { balance: 500 });
  });

  it("no-ops when socket server is not initialized", () => {
    setSocketServer(null);
    emitToUser("user-1", "test_event", { ok: true });
    expect(emit).not.toHaveBeenCalled();
  });
});
