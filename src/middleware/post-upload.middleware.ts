import multer from "multer";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const POST_UPLOAD_DIR = path.join(process.cwd(), "uploads", "posts");
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

if (!fs.existsSync(POST_UPLOAD_DIR)) {
  fs.mkdirSync(POST_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, POST_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

  if (!isImage && !isVideo) {
    cb(new Error("Invalid file type. Allowed: JPEG, PNG, MP4, MOV, WebM"));
    return;
  }

  // Size is enforced after upload in enforcePostMediaSize (file.size is often 0 here).
  cb(null, true);
};

export const postUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: VIDEO_MAX_BYTES,
    files: 1,
  },
});

/**
 * Multer fileFilter cannot reliably read size; enforce image/video caps after write.
 */
export function enforcePostMediaSize(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const file = req.file;
  if (!file) {
    next();
    return;
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  const max = isImage ? IMAGE_MAX_BYTES : isVideo ? VIDEO_MAX_BYTES : 0;
  const label = isImage ? "Image" : "Video";
  const maxMb = Math.round(max / (1024 * 1024));

  if (max > 0 && file.size > max) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // ignore cleanup errors
    }
    res.status(400).json({
      success: false,
      error: `${label} must be ${maxMb} MB or smaller`,
    });
    return;
  }

  next();
}

export function getPostMediaPath(filename: string): string {
  return `/uploads/posts/${filename}`;
}
