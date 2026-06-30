import { RtcRole, RtcTokenBuilder } from "agora-access-token";
import { config } from "../config/environment";
import { AppError } from "../middleware/error.middleware";

const TOKEN_TTL_SECONDS = 3600;

export function agoraUidFromUserId(userId: string): number {
  const hex = userId.replace(/-/g, "").slice(0, 8);
  const uid = parseInt(hex, 16) % 2147483646;
  return uid || 1;
}

export class AgoraService {
  generateRtcToken(channelName: string, userId: string): {
    token: string;
    uid: number;
    app_id: string;
    expires_at: number;
  } {
    const { appId, appCertificate } = config.agora;

    if (!appId || !appCertificate) {
      throw new AppError("Agora is not configured on the server", 503);
    }

    const uid = agoraUidFromUserId(userId);
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiresAt
    );

    return {
      token,
      uid,
      app_id: appId,
      expires_at: expiresAt,
    };
  }
}
