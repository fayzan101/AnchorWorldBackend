import dotenv from "dotenv";

dotenv.config();

export const config = {
  server: {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "3000", 10),
    apiPrefix: process.env.API_PREFIX || "/api",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "dating_app",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "your_access_secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your_refresh_secret",
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || "15m",
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  },
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@datingapp.com",
  },
  upload: {
    directory: process.env.UPLOAD_DIR || "uploads",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10),
    allowedTypes: (
      process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/jpg"
    ).split(","),
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || "http://localhost:3001").split(","),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3001",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3001",
  },
  firebase: {
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      "firebase-service-account.json",
  },
};

export default config;
