import { Router } from "express";
import {
  createHistory,
  getHistoryByPatient,
  getAllHistory,
  deleteHistoryByPatient,
} from "./service/historyService.js";
import {
  createChat,
  addMessage,
  getChatById,
  getChatsByPatient,
  getAllChats,
  deleteChatsByPatient,
  deleteChatById,
} from "./service/chatService.js";
import { refineText } from "./service/refinementService.js";
import { detectAlphabet } from "./service/aiService.js";
import { getActiveSessions, getSessionCount } from "./service/webSocket.js";
import createLogger from "./logger.js";
import { config } from "./config.js";

const router = Router();
const logger = createLogger("Routes");

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────
// HEALTH & STATUS
// ─────────────────────────────────────────────

/**
 * GET /api/status
 * Ringkasan status server dan konfigurasi aktif.
 */
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeSessions: getSessionCount(),
      config: {
        environment: config.NODE_ENV,
        useMockAI: config.USE_MOCK_AI,
        enableRefinement: config.ENABLE_REFINEMENT,
        aiServiceUrl: config.USE_MOCK_AI ? "MOCK" : config.AI_SERVICE_URL,
        geminiModel: config.GEMINI_MODEL ?? null,
      },
    });
  }),
);

// ─────────────────────────────────────────────
// AI DETECTION
// ─────────────────────────────────────────────

/**
 * POST /api/detect
 * Deteksi huruf isyarat dari satu frame gambar (base64).
 *
 * Body: { frame: string }
 * Response: { alphabet: string }
 */
router.post(
  "/detect",
  asyncHandler(async (req, res) => {
    const { frame } = req.body;

    if (!frame) {
      return res.status(400).json({ error: "frame is required" });
    }

    if (frame.length > config.WS_MAX_FRAME_SIZE) {
      return res.status(413).json({
        error: `Frame exceeds maximum size of ${config.WS_MAX_FRAME_SIZE} bytes`,
      });
    }

    const result = await detectAlphabet(frame);
    logger.debug("REST detect result:", result);
    res.json(result);
  }),
);

// ─────────────────────────────────────────────
// TEXT REFINEMENT
// ─────────────────────────────────────────────

/**
 * POST /api/refine
 * Merapikan teks hasil deteksi menggunakan Gemini (atau mock).
 *
 * Body: { text: string }
 * Response: { original: string, refined: string }
 */
router.post(
  "/refine",
  asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text (string) is required" });
    }

    const refined = await refineText(text);
    res.json({ original: text, refined });
  }),
);

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────

/**
 * POST /api/history
 * Simpan riwayat deteksi secara manual (tanpa WebSocket).
 *
 * Body: { patientName, detectedText, refinedText?, frameCount? }
 * Response: saved History document
 */
router.post(
  "/history",
  asyncHandler(async (req, res) => {
    const { patientName, detectedText, refinedText, frameCount } = req.body;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }
    if (!detectedText) {
      return res.status(400).json({ error: "detectedText is required" });
    }

    const record = await createHistory(
      patientName,
      detectedText,
      refinedText ?? null,
      frameCount ?? 0,
    );

    res.status(201).json(record);
  }),
);

/**
 * GET /api/history
 * Ambil seluruh riwayat (semua pasien). Query: ?limit=100
 *
 * Response: History[]
 */
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const history = await getAllHistory(limit);
    res.json({ total: history.length, data: history });
  }),
);

/**
 * GET /api/history/:patientName
 * Ambil riwayat berdasarkan nama pasien.
 *
 * Response: History[]
 */
router.get(
  "/history/:patientName",
  asyncHandler(async (req, res) => {
    const { patientName } = req.params;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const history = await getHistoryByPatient(patientName);
    res.json({ patientName, total: history.length, data: history });
  }),
);

/**
 * DELETE /api/history/:patientId
 * Hapus seluruh riwayat milik pasien berdasarkan patientId.
 *
 * Response: { deleted: number }
 */
router.delete(
  "/history/:patientId",
  asyncHandler(async (req, res) => {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: "patientId is required" });
    }

    const result = await deleteHistoryByPatient(patientId);
    res.json({ message: "History deleted", deleted: result.deletedCount });
  }),
);

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────

/**
 * POST /api/chat
 * Buat sesi chat baru untuk pasien.
 *
 * Body: { patientName: string }
 * Response: saved Chat document
 */
router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const { patientName } = req.body;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const chat = await createChat(patientName);
    res.status(201).json(chat);
  }),
);

/**
 * GET /api/chat
 * Ambil seluruh sesi chat (semua pasien). Query: ?limit=100
 *
 * Response: { total: number, data: Chat[] }
 */
router.get(
  "/chat",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const chats = await getAllChats(limit);
    res.json({ total: chats.length, data: chats });
  }),
);

/**
 * GET /api/chat/patient/:patientName
 * Ambil semua sesi chat milik satu pasien.
 *
 * Response: { patientName: string, total: number, data: Chat[] }
 */
router.get(
  "/chat/patient/:patientName",
  asyncHandler(async (req, res) => {
    const { patientName } = req.params;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const chats = await getChatsByPatient(patientName);
    res.json({ patientName, total: chats.length, data: chats });
  }),
);

/**
 * GET /api/chat/:chatId
 * Ambil satu sesi chat berdasarkan ID.
 *
 * Response: Chat document
 */
router.get(
  "/chat/:chatId",
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    const chat = await getChatById(chatId);
    res.json(chat);
  }),
);

/**
 * POST /api/chat/:chatId/message
 * Tambah pesan ke sesi chat yang sudah ada.
 *
 * Body: { sender: "patient"|"ai"|"doctor", message: string }
 * Response: updated Chat document
 */
router.post(
  "/chat/:chatId/message",
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { sender, message } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }
    if (!sender) {
      return res.status(400).json({ error: "sender is required" });
    }
    if (!["patient", "ai", "doctor"].includes(sender)) {
      return res.status(400).json({
        error: "sender must be one of: patient, ai, doctor",
      });
    }
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    const chat = await addMessage(chatId, sender, message);
    res.json(chat);
  }),
);

/**
 * DELETE /api/chat/patient/:patientName
 * Hapus semua sesi chat milik satu pasien.
 *
 * Response: { message: string, deleted: number }
 */
router.delete(
  "/chat/patient/:patientName",
  asyncHandler(async (req, res) => {
    const { patientName } = req.params;

    if (!patientName) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const result = await deleteChatsByPatient(patientName);
    res.json({ message: "Chats deleted", deleted: result.deletedCount });
  }),
);

/**
 * DELETE /api/chat/:chatId
 * Hapus satu sesi chat berdasarkan ID.
 *
 * Response: { message: string, data: Chat }
 */
router.delete(
  "/chat/:chatId",
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    const result = await deleteChatById(chatId);
    res.json({ message: "Chat deleted", data: result });
  }),
);

// ─────────────────────────────────────────────
// WEBSOCKET SESSIONS (monitoring)
// ─────────────────────────────────────────────

/**
 * GET /api/sessions
 * Daftar sesi WebSocket aktif beserta info dasar.
 *
 * Response: { count: number, sessions: SessionInfo[] }
 */
router.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const sessions = getActiveSessions().map((s) => ({
      clientId: s.clientId,
      patientId: s.patientId ?? null,
      frameCount: s.frameCount,
      bufferLength: s.buffer.length,
      uptime: Date.now() - s.startTime,
    }));

    res.json({ count: sessions.length, sessions });
  }),
);

// ─────────────────────────────────────────────
// ROUTE-LEVEL ERROR HANDLER
// ─────────────────────────────────────────────
router.use((err, req, res, _next) => {
  logger.error(`Route error [${req.method} ${req.path}]:`, err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: config.isDevelopment ? err.message : "An error occurred",
  });
});

export default router;
