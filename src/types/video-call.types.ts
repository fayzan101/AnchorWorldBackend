import { VideoCallStatus, CallType } from "../entities/VideoCall.entity";

export interface VideoCallRequestDto {
  callee_id: string;
  duration_minutes: 5 | 10;
  call_type?: "voice" | "video";
}

export interface VideoCallParticipant {
  id: string;
  full_name: string;
  profile_picture: string | null;
}

export interface VideoCallResponse {
  id: string;
  caller_id: string;
  callee_id: string;
  status: VideoCallStatus;
  call_type: CallType;
  duration_minutes: number;
  points_spent: number;
  channel_name: string;
  started_at: Date | null;
  ended_at: Date | null;
  expires_at: Date;
  created_at: Date;
  caller?: VideoCallParticipant;
  callee?: VideoCallParticipant;
}

export interface VideoCallTokenResponse {
  call_id: string;
  channel_name: string;
  token: string;
  uid: number;
  app_id: string;
  expires_at: number;
  call_type: CallType;
}
