import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config/environment";
import { initializeDatabase } from "./config/database";
import { initializeSocket } from "./config/socket";
import { initializeFirebase } from "./config/firebase";
import { createApp } from "./app";

class Server {
  private app = createApp();
  private httpServer = createServer(this.app);
  private io: SocketIOServer | undefined;

  constructor() {
    this.configureSocketHealth();
  }

  private configureSocketHealth(): void {
    this.app.get("/health/socket", (_req, res): void => {
      if (!this.io) {
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
        clientsCount: this.io.engine.clientsCount,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public async start(): Promise<void> {
    try {
      await initializeDatabase();
      initializeFirebase();
      this.io = initializeSocket(this.httpServer);

      this.httpServer.listen(config.server.port, "0.0.0.0", () => {
        console.log("═══════════════════════════════════════════════════════");
        console.log(`🚀 Server running in ${config.server.nodeEnv} mode`);
        console.log(`📡 HTTP Server: http://localhost:${config.server.port}`);
        console.log(`🔌 Socket.IO: ws://localhost:${config.server.port}`);
        console.log(`📚 API Prefix: ${config.server.apiPrefix}`);
        console.log(
          `📖 API Docs: http://localhost:${config.server.port}${config.server.apiPrefix}/docs`
        );
        console.log("═══════════════════════════════════════════════════════");
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const server = new Server();
  server.start();

  process.on("unhandledRejection", (reason: Error) => {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });
}

export default Server;
