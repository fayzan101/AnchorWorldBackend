import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { config } from "./config/environment";
import { metricsMiddleware } from "./middleware/metrics.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { setupSwagger } from "./config/swagger";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import userRoutes from "./routes/user.routes";
import followRoutes from "./routes/follow.routes";
import messageRoutes from "./routes/message.routes";
import notificationRoutes from "./routes/notification.routes";
import hobbyRoutes from "./routes/hobby.routes";
import pointsRoutes from "./routes/points.routes";
import premiumRoutes from "./routes/premium.routes";
import referralRoutes from "./routes/referral.routes";
import circleRoutes from "./routes/circle.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import discoverRoutes from "./routes/discover.routes";
import videoCallRoutes from "./routes/video-call.routes";
import adminRoutes from "./routes/admin.routes";
import metricsRoutes from "./routes/metrics.routes";
import locationRoutes from "./routes/location.routes";
import { deepLinkRouter } from "./routes/deep-link.routes";

export function createApp(): Application {
  const app = express();

  app.use(
    helmet({
      // Allow the deep-link bridge pages to run a tiny inline redirect script.
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );
  app.use(compression());

  if (config.server.nodeEnv === "development") {
    app.use(morgan("dev"));
  } else if (config.server.nodeEnv !== "test") {
    app.use(morgan("combined"));
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(metricsMiddleware);

  app.use("/.well-known", express.static(path.join(process.cwd(), ".well-known")));
  // Apple App Site Association must be served as JSON (no file extension)
  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    res.type("application/json");
    res.sendFile(path.join(process.cwd(), ".well-known", "apple-app-site-association"));
  });
  app.get("/apple-app-site-association", (_req, res) => {
    res.type("application/json");
    res.sendFile(path.join(process.cwd(), ".well-known", "apple-app-site-association"));
  });
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // App Link fallbacks (must be before API 404 JSON handler)
  app.use(deepLinkRouter);

  const apiPrefix = config.server.apiPrefix;

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      message: "Server is running",
      environment: config.server.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/socket", (_req, res) => {
    const socketIo = app.locals.socketIo;

    if (!socketIo) {
      res.status(503).json({
        success: false,
        message: "Socket.IO not initialized",
      });
      return;
    }

    res.json({
      success: true,
      message: "Socket.IO is running",
      active: true,
      clientsCount: socketIo.engine.clientsCount,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/metrics", metricsRoutes);

  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/profile`, profileRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/follows`, followRoutes);
  app.use(`${apiPrefix}/messages`, messageRoutes);
  app.use(`${apiPrefix}/notifications`, notificationRoutes);
  app.use(`${apiPrefix}/hobbies`, hobbyRoutes);
  app.use(`${apiPrefix}/points`, pointsRoutes);
  app.use(`${apiPrefix}/premium`, premiumRoutes);
  app.use(`${apiPrefix}/referrals`, referralRoutes);
  app.use(`${apiPrefix}/circles`, circleRoutes);
  app.use(`${apiPrefix}/posts`, postRoutes);
  app.use(`${apiPrefix}/comments`, commentRoutes);
  app.use(`${apiPrefix}/onboarding`, onboardingRoutes);
  app.use(`${apiPrefix}/discover`, discoverRoutes);
  app.use(`${apiPrefix}/locations`, locationRoutes);
  app.use(`${apiPrefix}/video-calls`, videoCallRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);

  setupSwagger(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
