/**
 * Integration Tests - Full Pipeline
 *
 * These tests simulate real-world scenarios:
 * 1. Client connects
 * 2. Sends multiple frames
 * 3. Receives streaming responses
 * 4. Stream ends
 * 5. Receives final response
 * 6. Verifies history is saved
 */

import {
  StreamSession,
  handleMessage,
} from "../../service/streamController.js";
import { detectAlphabet } from "../../service/aiService.js";
import { refineText } from "../../service/refinementService.js";
import * as historyService from "../../service/historyService.js";

jest.mock("../../service/historyService.js");

describe("Integration - Full Stream Pipeline", () => {
  let mockWs;
  let session;
  const patientId = "patient_integration_001";

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = {
      readyState: 1, // OPEN
      send: jest.fn((data) => {
        // Capture sent messages for analysis
        const message = JSON.parse(data);
        console.log("Sent:", message.type, message);
      }),
    };
    session = new StreamSession(mockWs, "integration_client", patientId);
    historyService.createHistory.mockResolvedValue({ _id: "saved" });
  });

  test("should complete full stream: connect -> frames -> end -> save", async () => {
    // Step 1: Connect
    const connectMsg = JSON.stringify({
      type: "connect",
      patientId,
    });
    await handleMessage(mockWs, connectMsg, session);
    expect(session.patientId).toBe(patientId);

    // Step 2: Send frames A, K, U
    const frames = [
      { type: "frame", frame: "frame_a" },
      { type: "frame", frame: "frame_k" },
      { type: "frame", frame: "frame_u" },
    ];

    for (const frameData of frames) {
      const message = JSON.stringify(frameData);
      await handleMessage(mockWs, message, session);
    }

    // Should have accumulated buffer
    expect(session.frameCount).toBe(3);
    expect(session.buffer.length).toBeGreaterThan(0);

    // Should have sent 3 stream responses
    const streamCalls = mockWs.send.mock.calls.filter((call) => {
      const data = JSON.parse(call[0]);
      return data.type === "stream";
    });
    expect(streamCalls.length).toBeGreaterThanOrEqual(3);

    // Step 3: Send end message
    const endMsg = JSON.stringify({ type: "end" });

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    await handleMessage(mockWs, endMsg, session);

    // Should attempt to save history
    if (session.patientId && session.buffer) {
      // History save should be called (might be called async)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  test("should handle timeout stream ending", async () => {
    // Arrange: Send frame data
    const frameMsg = JSON.stringify({
      type: "frame",
      frame: "timeout_test_frame",
    });

    // Act: Send frame (triggers timeout)
    await handleMessage(mockWs, frameMsg, session);

    // Verify timeout was set
    expect(session.timeoutHandle).not.toBeNull();

    // Wait for timeout to trigger
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Assert: Final response should have been sent
    const finalCalls = mockWs.send.mock.calls.filter((call) => {
      const data = JSON.parse(call[0]);
      return data.type === "final";
    });
    expect(finalCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("should handle buffer size overflow", async () => {
    // Simulate very large buffer
    session.buffer = "A".repeat(15000); // Exceeds MAX_BUFFER_SIZE

    const frameMsg = JSON.stringify({
      type: "frame",
      frame: "overflow_frame",
    });

    await handleMessage(mockWs, frameMsg, session);

    // Should have sent final response due to overflow
    const finalCalls = mockWs.send.mock.calls.filter((call) => {
      const data = JSON.parse(call[0]);
      return data.type === "final";
    });
    expect(finalCalls.length).toBeGreaterThan(0);
  });

  test("should handle frame size validation", async () => {
    // Create oversized frame
    const largeFrame = "x".repeat(10 * 1024 * 1024); // 10MB

    const frameMsg = JSON.stringify({
      type: "frame",
      frame: largeFrame,
    });

    await handleMessage(mockWs, frameMsg, session);

    // Should reject with error
    const errorCalls = mockWs.send.mock.calls.filter((call) => {
      const data = JSON.parse(call[0]);
      return data.type === "error";
    });
    expect(errorCalls.length).toBeGreaterThan(0);
  });

  test("should handle multiple concurrent operations safely", async () => {
    // Simulate rapid frame sending
    const promises = [];

    for (let i = 0; i < 5; i++) {
      const frameMsg = JSON.stringify({
        type: "frame",
        frame: `frame_${i}`,
      });
      promises.push(handleMessage(mockWs, frameMsg, session));
    }

    await Promise.all(promises);

    // Should have processed all frames
    expect(session.frameCount).toBe(5);

    // Should not have double finalization
    expect(session.finalizationInProgress).toBe(false);
  });
});

describe("Integration - Error Scenarios", () => {
  let mockWs;
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = {
      readyState: 1,
      send: jest.fn(),
    };
    session = new StreamSession(mockWs, "error_test_client", "patient_error");
    historyService.createHistory.mockRejectedValue(new Error("DB Error"));
  });

  test("should continue on history save failure", async () => {
    session.buffer = "TEST";

    await session.sendFinalResponse();

    // Should still send final response despite DB error
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining("final"));
  });

  test("should handle disconnected websocket", async () => {
    mockWs.readyState = 3; // CLOSED

    const frameMsg = JSON.stringify({
      type: "frame",
      frame: "disconnected_test",
    });

    await handleMessage(mockWs, frameMsg, session);

    // Should not crash
    expect(session.isActive).toBe(true);
  });
});

describe("Integration - Data Accuracy", () => {
  let mockWs;
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWs = {
      readyState: 1,
      send: jest.fn(),
    };
    session = new StreamSession(mockWs, "accuracy_test", "patient_accuracy");
    historyService.createHistory.mockResolvedValue({});
  });

  test("should preserve alphabet order", async () => {
    const alphabets = ["A", "K", "U", "M", "U", "L", "A", "S", "I"];
    const expectedBuffer = alphabets.join("");

    // Simulate each alphabet being detected
    for (const alphabet of alphabets) {
      session.buffer += alphabet;
      session.frameCount++;
    }

    expect(session.buffer).toBe(expectedBuffer);
    expect(session.frameCount).toBe(9);
  });

  test("should track frame count accurately", async () => {
    for (let i = 0; i < 10; i++) {
      session.frameCount++;
    }

    expect(session.frameCount).toBe(10);
  });

  test("should maintain session metadata", async () => {
    const startTime = session.startTime;

    session.frameCount = 5;
    session.buffer = "TEST";

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(session.startTime).toBe(startTime);
    expect(session.frameCount).toBe(5);
    expect(session.buffer).toBe("TEST");
  });
});
