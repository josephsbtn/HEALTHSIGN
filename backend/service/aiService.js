import axios from "axios";
import { config } from "../config.js";
import createLogger from "../logger.js";

const logger = createLogger("AIService");

const MOCK_ALPHABETS = [
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
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRandomAlphabet = () => {
  return MOCK_ALPHABETS[Math.floor(Math.random() * MOCK_ALPHABETS.length)];
};

const getRandomDelay = () => {
  const { MOCK_AI_DELAY_MIN, MOCK_AI_DELAY_MAX } = config;
  return (
    Math.floor(Math.random() * (MOCK_AI_DELAY_MAX - MOCK_AI_DELAY_MIN + 1)) +
    MOCK_AI_DELAY_MIN
  );
};

export const detectAlphabetFromAPI = async (frame) => {
  try {
    const response = await axios.post(
      `${config.AI_SERVICE_URL}/detect`,
      { frame },
      { timeout: config.AI_SERVICE_TIMEOUT },
    );

    if (!response.data || typeof response.data.alphabet !== "string") {
      const message = "Invalid response from AI service";
      logger.warn(message, response.data);
      if (config.USE_MOCK_AI) {
        return detectAlphabetMock(frame);
      }
      throw new Error(message);
    }

    logger.debug("Detected alphabet from API:", response.data.alphabet);
    return response.data;
  } catch (error) {
    logger.error("AI service error", error?.message ?? error);
    if (config.USE_MOCK_AI) {
      return detectAlphabetMock(frame);
    }
    throw error;
  }
};

export const detectAlphabetMock = async (frame) => {
  await delay(getRandomDelay());
  const alphabet = getRandomAlphabet();
  logger.debug("Mock detection result:", alphabet);
  return { alphabet };
};

export const detectAlphabet = async (frame) => {
  if (!frame) {
    logger.warn("Empty frame received");
    return { alphabet: "" };
  }

  try {
    if (config.USE_MOCK_AI) {
      return await detectAlphabetMock(frame);
    }
    return await detectAlphabetFromAPI(frame);
  } catch (error) {
    logger.error("Unexpected error in detectAlphabet:", error?.message ?? error);
    return { alphabet: "" };
  }
};

export default {
  detectAlphabet,
  detectAlphabetFromAPI,
  detectAlphabetMock,
};
