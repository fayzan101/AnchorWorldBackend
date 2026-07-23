import multer from "multer";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const MESSAGE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "messages");
export const VOICE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_AUDIO_TYPES = [
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/x-m4a",
];

if (!fs.existsSync(MESSAGE_UPLOAD_DIR)) {
  fs.mkdirSync(MESSAGE_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, MESSAGE_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname) || ".m4a";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ok =
    ALLOWED_AUDIO_TYPES.includes(file.mimetype) ||
    file.mimetype.startsWith("audio/");
  if (!ok) {
    cb(new Error("Invalid file type. Allowed: audio (m4a, aac, mp3, wav, webm)"));
    return;
  }
  cb(null, true);
};

export const messageVoiceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: VOICE_MAX_BYTES,
    files: 1,
  },
});

export function enforceVoiceSize(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const file = req.file;
  if (!file) {
    next();
    return;
  }

  if (file.size > VOICE_MAX_BYTES) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // ignore
    }
    res.status(400).json({
      success: false,
      error: "Voice message must be 10 MB or smaller",
    });
    return;
  }

  next();
}

export function getMessageMediaPath(filename: string): string {
  return `/uploads/messages/${filename}`;
}
