import {
  StreamSession,
  handleMessage,
} from "../../service/streamController.js";
import * as aiService from "../../service/aiService.js";
import * as refinementService from "../../service/refinementService.js";
import * as historyService from "../../service/historyService.js";

jest.mock("../../service/aiService.js");
jest.mock("../../service/refinementService.js");
jest.mock("../../service/historyService.js");

describe("StreamSession", () => {
  let mockWs;
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = {
      readyState: 1, // OPEN
      send: jest.fn(),
    };
    session = new StreamSession(mockWs, "client_123", "patient_456");
  });

  test("should create session with correct properties", () => {
    expect(session.clientId).toBe("client_123");
    expect(session.patientId).toBe("patient_456");
    expect(session.buffer).toBe("");
    expect(session.isActive).toBe(true);
    expect(session.frameCount).toBe(0);
  });

  test("should accumulate buffer", () => {
    session.sendStreamResponse("A");
    session.buffer += "A";
    session.frameCount++;

    session.sendStreamResponse("K");
    session.buffer += "K";
    session.frameCount++;

    expect(session.buffer).toBe("AK");
    expect(session.frameCount).toBe(2);
  });

  test("should send stream response", () => {
    session.sendStreamResponse("A");

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify(
        expect.objectContaining({
          type: "stream",
          alphabet: "A",
        }),
      ),
    );
  });

  test("should not send if connection closed", () => {
    mockWs.readyState = 3; // CLOSED
    session.sendStreamResponse("A");

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  test("should clear timeout", (done) => {
    const callback = jest.fn();
    session.setStreamTimeout(callback);

    // Clear before timeout fires
    session.clearTimeout();

    setTimeout(() => {
      expect(callback).not.toHaveBeenCalled();
      done();
    }, 200);
  }, 1000);

  test("should reset buffer", () => {
    session.buffer = "AKUMULASI";
    session.frameCount = 9;

    session.resetBuffer();

    expect(session.buffer).toBe("");
    expect(session.frameCount).toBe(0);
  });

  test("should close session", () => {
    session.close();

    expect(session.isActive).toBe(false);
  });

  test("should guard against double finalization", async () => {
    refinementService.refineText.mockResolvedValue("AKUMULASI");
    historyService.createHistory.mockResolvedValue({});

    session.buffer = "AKUMULASI";

    // Start first finalization
    session.finalizationInProgress = true;

    // Try to finalize again
    await session.sendFinalResponse();

    // Should not proceed
    expect(mockWs.send).not.toHaveBeenCalled();
  });
});

describe("handleMessage", () => {
  let mockWs;
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = {
      readyState: 1,
      send: jest.fn(),
    };
    session = new StreamSession(mockWs, "client_123", "patient_456");
    aiService.detectAlphabet.mockResolvedValue({ alphabet: "A" });
  });

  test("should handle frame message", async () => {
    const message = JSON.stringify({
      type: "frame",
      frame: "base64framedata",
    });

    await handleMessage(mockWs, message, session);

    expect(aiService.detectAlphabet).toHaveBeenCalledWith("base64framedata");
  });

  test("should handle end message", async () => {
    session.buffer = "AKUMULASI";
    refinementService.refineText.mockResolvedValue("AKUMULASI");

    const message = JSON.stringify({ type: "end" });

    await handleMessage(mockWs, message, session);

    // Should trigger finalization
    expect(refinementService.refineText).toHaveBeenCalledWith("AKUMULASI");
  });

  test("should handle connect message with patientId", async () => {
    session.patientId = null;
    const message = JSON.stringify({
      type: "connect",
      patientId: "patient_789",
    });

    await handleMessage(mockWs, message, session);

    expect(session.patientId).toBe("patient_789");
  });

  test("should reject invalid message", async () => {
    const message = JSON.stringify({
      type: "invalid",
    });

    await handleMessage(mockWs, message, session);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining("error"));
  });

  test("should reject empty frame", async () => {
    const message = JSON.stringify({
      type: "frame",
      frame: "",
    });

    await handleMessage(mockWs, message, session);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining("error"));
  });

  test("should handle malformed JSON", async () => {
    const message = "not valid json";

    await handleMessage(mockWs, message, session);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining("error"));
  });
});
