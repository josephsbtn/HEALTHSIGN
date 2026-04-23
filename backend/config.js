import dotenv from "dotenv";

dotenv.config();

const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value !== undefined ? value : defaultValue;
};

const getEnvNumber = (key, defaultValue) => {
  const value = getEnv(key, defaultValue);
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }
  return num;
};

const getEnvBoolean = (key, defaultValue) => {
  const value = getEnv(key, defaultValue);
  return value === "true" || value === "1" || value === "yes";
};

export const config = {
  // Server
  PORT: getEnvNumber("PORT", 8000),
  NODE_ENV: getEnv("NODE_ENV", "development"),
  isDevelopment: getEnv("NODE_ENV", "development") === "development",

  // DATABASE - MUST be in .env, never hardcoded
  MONGO_URI: getEnv(
    "MONGO_URI",
    "mongodb+srv://josephsebastian2505:080107@cluster0.8qnvp.mongodb.net/health_sign?retryWrites=true&w=majority",
  ),

  // AI Service
  AI_SERVICE_URL: getEnv("AI_SERVICE_URL", "http://localhost:5000"),
  AI_SERVICE_TIMEOUT: getEnvNumber("AI_SERVICE_TIMEOUT", 5000),

  // Text Refinement
  ENABLE_REFINEMENT: getEnvBoolean("ENABLE_REFINEMENT", false),
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
  GEMINI_MODEL: getEnv("GEMINI_MODEL", "gemini-pro"),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: getEnvNumber("WS_HEARTBEAT_INTERVAL", 30000),
  WS_STREAM_TIMEOUT: getEnvNumber("WS_STREAM_TIMEOUT", 1500),
  WS_MAX_FRAME_SIZE: getEnvNumber("WS_MAX_FRAME_SIZE", 5242880), // 5MB

  // Mock Service
  USE_MOCK_AI: getEnvBoolean("USE_MOCK_AI", true),
  MOCK_AI_DELAY_MIN: getEnvNumber("MOCK_AI_DELAY_MIN", 50),
  MOCK_AI_DELAY_MAX: getEnvNumber("MOCK_AI_DELAY_MAX", 150),

  // Detection stability
  FRAME_STABILITY_THRESHOLD: getEnvNumber("FRAME_STABILITY_THRESHOLD", 2),

  // Buffer limits
  MAX_BUFFER_SIZE: getEnvNumber("MAX_BUFFER_SIZE", 10000),
  MAX_CONCURRENT_FRAMES: getEnvNumber("MAX_CONCURRENT_FRAMES", 100),

  // Logging
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};

export default config;
