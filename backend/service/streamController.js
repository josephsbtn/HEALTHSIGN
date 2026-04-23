import { detectAlphabet } from "./aiService.js";
import { refineText } from "./refinementService.js";
import { createHistory } from "./historyService.js";
import {
  isValidMessage,
  formatStreamResponse,
  formatFinalResponse,
  formatErrorResponse,
} from "../utils.js";
import createLogger from "../logger.js";
import { config } from "../config.js";

const logger = createLogger("StreamController");

export class StreamSession {
  constructor(ws, clientId, patientId = null) {
    this.ws = ws;
    this.clientId = clientId;
    this.patientId = patientId;
    this.buffer = "";
    this.frameCount = 0;
    this.timeoutHandle = null;
    this.isActive = true;
    this.finalizationInProgress = false; // Guard against double finalization
    this.startTime = Date.now();
    logger.debug(
      `Stream session created for client: ${clientId}, patient: ${patientId}`,
    );
  }

  clearTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  setStreamTimeout(callback) {
    this.clearTimeout();
    this.timeoutHandle = setTimeout(callback, config.WS_STREAM_TIMEOUT);
  }

  sendStreamResponse(alphabet) {
    if (!this.isActive || this.ws.readyState !== 1) {
      return;
    }
    try {
      this.ws.send(JSON.stringify(formatStreamResponse(alphabet)));
      logger.debug(`Sent stream response to ${this.clientId}:`, alphabet);
    } catch (error) {
      logger.error(
        `Failed to send stream response to ${this.clientId}:`,
        error.message,
      );
    }
  }

  async sendFinalResponse() {
    // Guard against double finalization
    if (this.finalizationInProgress) {
      logger.warn(
        `Finalization already in progress for ${this.clientId}, skipping`,
      );
      return;
    }

    if (!this.isActive || this.ws.readyState !== 1) {
      return;
    }

    this.finalizationInProgress = true;

    try {
      const finalText = await refineText(this.buffer);
      const duration = Date.now() - this.startTime;

      // Try to save to history
      if (this.patientId && this.buffer) {
        try {
          await createHistory(
            this.patientId,
            this.buffer,
            finalText,
            this.frameCount,
          );
        } catch (error) {
          logger.error(
            `Failed to save history for ${this.patientId}:`,
            error.message,
          );
          // Continue anyway - send response even if DB save fails
        }
      }

      this.ws.send(
        JSON.stringify(
          formatFinalResponse(finalText, {
            originalText: this.buffer,
            frameCount: this.frameCount,
            duration: duration,
          }),
        ),
      );

      logger.info(
        `Sent final response to ${this.clientId}: "${finalText}" (${this.frameCount} frames, ${duration}ms)`,
      );
    } catch (error) {
      logger.error(
        `Failed to send final response to ${this.clientId}:`,
        error.message,
      );
      try {
        this.ws.send(
          JSON.stringify(
            formatErrorResponse("Failed to finalize stream", error.message),
          ),
        );
      } catch (e) {
        logger.error("Failed to send error response");
      }
    } finally {
      this.finalizationInProgress = false;
    }
  }

  resetBuffer() {
    this.buffer = "";
    this.frameCount = 0;
  }

  close() {
    this.isActive = false;
    this.clearTimeout();
    logger.debug(`Stream session closed for client: ${this.clientId}`);
  }
}

export const handleMessage = async (ws, message, session) => {
  try {
    const data = JSON.parse(message.toString());

    if (!isValidMessage(data)) {
      logger.warn(
        `Invalid message format from ${session.clientId}:`,
        JSON.stringify(data),
      );
      ws.send(JSON.stringify(formatErrorResponse("Invalid message format")));
      return;
    }

    if (data.type === "frame") {
      await handleFrameMessage(ws, data, session);
    } else if (data.type === "end") {
      await handleEndMessage(session);
    } else if (data.type === "connect") {
      // Allow dynamic patientId connection
      if (data.patientId) {
        session.patientId = data.patientId;
        logger.debug(
          `Patient ID set for ${session.clientId}: ${data.patientId}`,
        );
      }
    }
  } catch (error) {
    logger.error(
      `Error processing message from ${session.clientId}:`,
      error.message,
    );
    try {
      ws.send(
        JSON.stringify(
          formatErrorResponse("Internal server error", error.message),
        ),
      );
    } catch (e) {
      logger.error("Failed to send error response");
    }
  }
};

const handleFrameMessage = async (ws, data, session) => {
  session.clearTimeout();

  // Validation
  if (!data.frame) {
    logger.warn(`Empty frame from ${session.clientId}`);
    ws.send(JSON.stringify(formatErrorResponse("Empty frame data")));
    return;
  }

  // Check frame size
  if (data.frame.length > config.WS_MAX_FRAME_SIZE) {
    logger.warn(
      `Frame too large from ${session.clientId}: ${data.frame.length} bytes`,
    );
    ws.send(
      JSON.stringify(
        formatErrorResponse(
          `Frame exceeds maximum size of ${config.WS_MAX_FRAME_SIZE} bytes`,
        ),
      ),
    );
    return;
  }

  // Check buffer size
  if (session.buffer.length >= config.MAX_BUFFER_SIZE) {
    logger.warn(
      `Buffer overflow for ${session.clientId}, forcing finalization`,
    );
    session.clearTimeout();
    await session.sendFinalResponse();
    session.resetBuffer();
    return;
  }

  try {
    const result = await detectAlphabet(data.frame);

    if (result.alphabet) {
      session.buffer += result.alphabet;
      session.frameCount++;
      session.sendStreamResponse(result.alphabet);
    } else {
      logger.warn(`Empty alphabet from AI service for ${session.clientId}`);
    }

    session.setStreamTimeout(() => {
      logger.debug(`Stream timeout triggered for ${session.clientId}`);
      session.sendFinalResponse();
      session.resetBuffer();
    });
  } catch (error) {
    logger.error(
      `Error detecting alphabet for ${session.clientId}:`,
      error.message,
    );
    ws.send(
      JSON.stringify(formatErrorResponse("AI service error", error.message)),
    );
  }
};

const handleEndMessage = async (session) => {
  logger.debug(`End message received from ${session.clientId}`);
  session.clearTimeout();
  await session.sendFinalResponse();
  session.resetBuffer();
};

export default {
  StreamSession,
  handleMessage,
};
