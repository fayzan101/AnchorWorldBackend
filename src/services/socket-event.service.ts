import { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setSocketServer(io: Server | null): void {
  ioInstance = io;
}

export function getSocketServer(): Server | null {
  return ioInstance;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  ioInstance?.to(userRoom(userId)).emit(event, payload);
}

export function emitPostLiked(
  receiverId: string,
  payload: { post_id: string; user_id: string; user_name: string }
): void {
  emitToUser(receiverId, "post_liked", payload);
}

export function emitPostCommented(
  receiverId: string,
  payload: { post_id: string; comment_id: string; user_id: string }
): void {
  emitToUser(receiverId, "post_commented", payload);
}

export function emitVideoCallRequest(
  receiverId: string,
  payload: {
    call_id: string;
    caller_id: string;
    caller_name: string;
    call_type?: "voice" | "video";
  }
): void {
  emitToUser(receiverId, "video_call_request", payload);
}

export function emitVideoCallAccepted(
  receiverId: string,
  payload: { call_id: string; call_type?: "voice" | "video" }
): void {
  emitToUser(receiverId, "video_call_accepted", payload);
}

export function emitFollowRequestCancelled(
  receiverId: string,
  payload: { follow_id: string; follower_id: string }
): void {
  emitToUser(receiverId, "follow_request_cancelled", payload);
}

export function emitPointsUpdated(
  userId: string,
  payload: { balance: number }
): void {
  emitToUser(userId, "points_updated", payload);
}
