import multer from "multer";
import path from "path";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const POST_UPLOAD_DIR = path.join(process.cwd(), "uploads", "posts");
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;

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

  if (isImage && file.size > IMAGE_MAX_BYTES) {
    cb(new Error("Image must be 5 MB or smaller"));
    return;
  }

  if (isVideo && file.size > VIDEO_MAX_BYTES) {
    cb(new Error("Video must be 20 MB or smaller"));
    return;
  }

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

export function getPostMediaPath(filename: string): string {
  return `/uploads/posts/${filename}`;
}
