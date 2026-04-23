import express from "express";
import cors from "cors";
import http from "http";
import { config } from "./config.js";
import {
  initWebSocketServer,
  closeAllSessions,
  getSessionCount,
} from "./service/webSocket.js";
import createLogger from "./logger.js";
import connectDB from "./database/dbconnect.js";
import routes from "./routes.js";

const logger = createLogger("Server");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Hand Sign Detection Backend",
    version: "1.0.0",
    activeSessions: getSessionCount(),
  });
});

// Health check detailed endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: getSessionCount(),
    environment: config.NODE_ENV,
  });
});

app.use("/api", routes);

// Error handler for uncaught errors
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: config.isDevelopment ? err.message : "An error occurred",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Graceful shutdown handler
const gracefulShutdown = () => {
  logger.info("Graceful shutdown initiated");
  closeAllSessions();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
server.listen(config.PORT, async () => {
  logger.info("=================================");
  logger.info("Hand Sign Detection Backend");
  logger.info("=================================");
  logger.info(`HTTP Server listening on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(
    `AI Service: ${config.USE_MOCK_AI ? "MOCK" : config.AI_SERVICE_URL}`,
  );
  logger.info(
    `Refinement: ${config.ENABLE_REFINEMENT ? "ENABLED" : "DISABLED"}`,
  );
  logger.info(`Stream Timeout: ${config.WS_STREAM_TIMEOUT}ms`);
  logger.info("=================================");

  // Connect to database
  try {
    logger.info("Connecting to database...");
    await connectDB();
    logger.info("✓ Database ready for operations");
  } catch (error) {
    logger.error("Fatal: Database connection required but failed");
    process.exit(1);
  }
});

server.on("error", (error) => {
  logger.error("Server error:", error.message);
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${config.PORT} is already in use`);
    process.exit(1);
  }
});

export default server;
