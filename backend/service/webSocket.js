import { WebSocketServer } from "ws";
import http from "http";
import { handleMessage, StreamSession } from "./streamController.js";
import { generateClientId } from "../utils.js";
import createLogger from "../logger.js";
import { config } from "../config.js";

const logger = createLogger("WebSocketServer");

let wss = null;
let expressServer = null;
let heartbeatInterval = null;
const activeSessions = new Map();

export const initWebSocketServer = (expressHttpServer) => {
  expressServer = expressHttpServer;

  wss = new WebSocketServer({ server: expressHttpServer });

  logger.info("WebSocket server initialized and attached to Express");

  wss.on("connection", handleClientConnection);
  wss.on("error", (error) => {
    logger.error("WebSocket server error:", error.message);
  });

  setupHeartbeat();

  return wss;
};

const handleClientConnection = (ws, request) => {
  const clientId = generateClientId();
  const clientIp = request.socket.remoteAddress;
  logger.info(`Client connected: ${clientId} from ${clientIp}`);

  // Initialize session with patientId as null (can be set later via connect message)
  const session = new StreamSession(ws, clientId, null);
  activeSessions.set(clientId, session);

  ws.isAlive = true;

  ws.on("message", (message) => {
    handleMessage(ws, message, session);
  });

  ws.on("error", (error) => {
    logger.error(`WebSocket error for ${clientId}:`, error.message);
  });

  ws.on("close", (code, reason) => {
    logger.info(`Client disconnected: ${clientId} (code: ${code})`);
    session.close();
    activeSessions.delete(clientId);
  });

  ws.on("pong", () => {
    ws.isAlive = true;
    logger.debug(`Heartbeat pong from ${clientId}`);
  });
};

const setupHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!wss) {
      clearInterval(heartbeatInterval);
      return;
    }

    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.warn("Terminating inactive client");
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, config.WS_HEARTBEAT_INTERVAL);
};

export const getActiveSessions = () => {
  return Array.from(activeSessions.values());
};

export const getSessionCount = () => {
  return activeSessions.size;
};

export const closeAllSessions = () => {
  activeSessions.forEach((session) => {
    session.close();
    if (session.ws && session.ws.readyState === 1) {
      session.ws.close(1000, "Server shutdown");
    }
  });
  activeSessions.clear();

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  logger.info("All sessions closed and heartbeat stopped");
};

export default {
  initWebSocketServer,
  getActiveSessions,
  getSessionCount,
  closeAllSessions,
};
