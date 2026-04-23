import {
  isValidMessage,
  formatStreamResponse,
  formatFinalResponse,
  formatErrorResponse,
  generateClientId,
} from "../../utils.js";

describe("Utils - Message Validation", () => {
  test("isValidMessage should accept frame type", () => {
    const message = { type: "frame", frame: "base64encodeddata" };
    expect(isValidMessage(message)).toBe(true);
  });

  test("isValidMessage should accept end type", () => {
    const message = { type: "end" };
    expect(isValidMessage(message)).toBe(true);
  });

  test("isValidMessage should accept connect type", () => {
    const message = { type: "connect", patientId: "patient_123" };
    expect(isValidMessage(message)).toBe(true);
  });

  test("isValidMessage should reject invalid type", () => {
    const message = { type: "invalid" };
    expect(isValidMessage(message)).toBe(false);
  });

  test("isValidMessage should reject null", () => {
    expect(isValidMessage(null)).toBe(false);
  });

  test("isValidMessage should reject frame without data", () => {
    const message = { type: "frame" };
    expect(isValidMessage(message)).toBe(false);
  });

  test("isValidMessage should reject frame with non-string data", () => {
    const message = { type: "frame", frame: 123 };
    expect(isValidMessage(message)).toBe(false);
  });
});

describe("Utils - Response Formatting", () => {
  test("formatStreamResponse should include type and alphabet", () => {
    const response = formatStreamResponse("A");
    expect(response.type).toBe("stream");
    expect(response.alphabet).toBe("A");
    expect(response.timestamp).toBeDefined();
  });

  test("formatStreamResponse should handle empty alphabet", () => {
    const response = formatStreamResponse("");
    expect(response.alphabet).toBe("");
  });

  test("formatFinalResponse should include type and text", () => {
    const response = formatFinalResponse("AKUMULASI");
    expect(response.type).toBe("final");
    expect(response.text).toBe("AKUMULASI");
    expect(response.timestamp).toBeDefined();
  });

  test("formatFinalResponse should include metadata if provided", () => {
    const metadata = { frameCount: 9, duration: 1500 };
    const response = formatFinalResponse("AKUMULASI", metadata);
    expect(response.metadata).toEqual(metadata);
  });

  test("formatErrorResponse should include type and message", () => {
    const response = formatErrorResponse("Invalid message");
    expect(response.type).toBe("error");
    expect(response.message).toBe("Invalid message");
    expect(response.timestamp).toBeDefined();
  });

  test("formatErrorResponse should include details if provided", () => {
    const response = formatErrorResponse(
      "Invalid message",
      "Frame size exceeded",
    );
    expect(response.details).toBe("Frame size exceeded");
  });
});

describe("Utils - ClientID Generation", () => {
  test("generateClientId should generate unique IDs", () => {
    const id1 = generateClientId();
    const id2 = generateClientId();
    expect(id1).not.toBe(id2);
  });

  test("generateClientId should start with client_ prefix", () => {
    const id = generateClientId();
    expect(id).toMatch(/^client_/);
  });

  test("generateClientId should include timestamp", () => {
    const before = Date.now();
    const id = generateClientId();
    const after = Date.now();

    const timestamp = parseInt(id.split("_")[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
