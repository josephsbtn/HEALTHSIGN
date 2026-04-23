import {
  detectAlphabet,
  detectAlphabetMock,
  detectAlphabetFromAPI,
} from "../../service/aiService.js";
import axios from "axios";
import { config } from "../../config.js";

jest.mock("axios");

describe("AIService - detectAlphabet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should detect alphabet from mock when USE_MOCK_AI is true", async () => {
    // Mock is default in config
    const result = await detectAlphabet("frameData");

    expect(result).toHaveProperty("alphabet");
    expect(typeof result.alphabet).toBe("string");
  });

  test("should return empty alphabet for null frame", async () => {
    const result = await detectAlphabet(null);
    expect(result.alphabet).toBe("");
  });

  test("should return empty alphabet for undefined frame", async () => {
    const result = await detectAlphabet(undefined);
    expect(result.alphabet).toBe("");
  });

  test("should return empty alphabet for empty string frame", async () => {
    const result = await detectAlphabet("");
    expect(result.alphabet).toBe("");
  });
});

describe("AIService - detectAlphabetMock", () => {
  test("should return valid alphabet from mock list", async () => {
    const result = await detectAlphabetMock("frameData");

    const validAlphabets = [
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

    expect(validAlphabets).toContain(result.alphabet);
  });

  test("should simulate delay", async () => {
    const startTime = Date.now();
    await detectAlphabetMock("frameData");
    const duration = Date.now() - startTime;

    // Should take at least MOCK_AI_DELAY_MIN
    expect(duration).toBeGreaterThanOrEqual(config.MOCK_AI_DELAY_MIN - 10); // -10 for tolerance
  });
});

describe("AIService - detectAlphabetFromAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call AI API with correct payload", async () => {
    axios.post.mockResolvedValue({
      data: { alphabet: "A" },
    });

    await detectAlphabetFromAPI("frameData");

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/detect"),
      { frame: "frameData" },
      { timeout: config.AI_SERVICE_TIMEOUT },
    );
  });

  test("should return alphabet from API response", async () => {
    axios.post.mockResolvedValue({
      data: { alphabet: "K" },
    });

    const result = await detectAlphabetFromAPI("frameData");
    expect(result.alphabet).toBe("K");
  });

  test("should fallback to mock on API error", async () => {
    axios.post.mockRejectedValue(new Error("Connection error"));

    const result = await detectAlphabetFromAPI("frameData");

    expect(result).toHaveProperty("alphabet");
    expect(typeof result.alphabet).toBe("string");
  });

  test("should fallback to mock on invalid response", async () => {
    axios.post.mockResolvedValue({
      data: {
        /* missing alphabet field */
      },
    });

    const result = await detectAlphabetFromAPI("frameData");

    expect(result).toHaveProperty("alphabet");
    expect(typeof result.alphabet).toBe("string");
  });

  test("should handle timeout", async () => {
    axios.post.mockRejectedValue(new Error("timeout"));

    const result = await detectAlphabetFromAPI("frameData");
    expect(result).toHaveProperty("alphabet");
  });
});
