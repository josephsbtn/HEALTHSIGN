// WebSocket Message Types
export const MessageType = {
  FRAME: "frame",
  END: "end",
  STREAM: "stream",
  FINAL: "final",
  ERROR: "error",
};

// WebSocket Connection States
export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// HTTP Status Codes
export const StatusCode = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
export const ErrorMessage = {
  INVALID_MESSAGE: "Invalid message format",
  EMPTY_FRAME: "Empty frame data",
  AI_SERVICE_ERROR: "AI service error",
  REFINEMENT_ERROR: "Text refinement error",
  WEBSOCKET_ERROR: "WebSocket error",
};

// Timeout Values (ms)
export const Timeouts = {
  AI_SERVICE: 5000,
  REFINEMENT: 5000,
  STREAM_IDLE: 1500,
};

// Mock Configuration
export const MockConfig = {
  ALPHABETS: [
    "A",
    "K",
    "U",
    "E",
    "I",
    "O",
    "N",
    "G",
    "S",
    "T",
    "D",
    "L",
    "R",
    "M",
    "P",
    "W",
    "Y",
    "J",
    "H",
    "B",
  ],
  DELAY_MIN: 50,
  DELAY_MAX: 150,
};

export default {
  MessageType,
  WebSocketState,
  StatusCode,
  ErrorMessage,
  Timeouts,
  MockConfig,
};
