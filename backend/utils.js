export const isValidMessage = (data) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (data.type === "frame") {
    return typeof data.frame === "string" || data.frame instanceof Buffer;
  }

  if (data.type === "end") {
    return true;
  }

  if (data.type === "connect") {
    return true;
  }

  if (data.type === "ping") {
    return true;
  }

  return false;
};

export const formatStreamResponse = (alphabet) => {
  return {
    type: "stream",
    alphabet: alphabet || "",
    timestamp: new Date().toISOString(),
  };
};

export const formatFinalResponse = (text, metadata = {}) => {
  return {
    type: "final",
    text: text || "",
    metadata,
    timestamp: new Date().toISOString(),
  };
};

export const formatErrorResponse = (message, details = null) => {
  return {
    type: "error",
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
};

export const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export default {
  isValidMessage,
  formatStreamResponse,
  formatFinalResponse,
  formatErrorResponse,
  generateClientId,
};
