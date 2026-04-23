/**
 * Database Service Tests
 *
 * Tests for History model operations:
 * - Create history
 * - Query history
 * - Error handling
 * - Data validation
 */

import mongoose from "mongoose";
import {
  createHistory,
  getHistoryByPatient,
  getAllHistory,
  deleteHistoryByPatient,
} from "../../service/historyService.js";
import History from "../../database/history.schema.js";

jest.mock("../../database/history.schema.js");

describe("HistoryService - Create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should create history record with valid data", async () => {
    const mockRecord = {
      patientId: "patient_001",
      detectedText: "AKUMULASI",
      refinedText: "AKUMULASI",
      frameCount: 9,
      _id: "record_001",
      save: jest.fn().mockResolvedValue({
        patientId: "patient_001",
        detectedText: "AKUMULASI",
        _id: "record_001",
      }),
    };

    History.mockImplementation(() => mockRecord);

    const result = await createHistory(
      "patient_001",
      "AKUMULASI",
      "AKUMULASI",
      9,
    );

    expect(mockRecord.save).toHaveBeenCalled();
    expect(result._id).toBe("record_001");
  });

  test("should reject missing patientId", async () => {
    await expect(createHistory(null, "AKUMULASI")).rejects.toThrow(
      "patientId is required",
    );
  });

  test("should reject missing detectedText", async () => {
    await expect(createHistory("patient_001", null)).rejects.toThrow(
      "detectedText is required",
    );
  });

  test("should handle save error", async () => {
    const mockRecord = {
      save: jest.fn().mockRejectedValue(new Error("DB Error")),
    };

    History.mockImplementation(() => mockRecord);

    await expect(createHistory("patient_001", "TEST")).rejects.toThrow(
      "DB Error",
    );
  });

  test("should set default values", async () => {
    const mockRecord = {
      save: jest.fn().mockResolvedValue({
        patientId: "patient_001",
        detectedText: "TEST",
        refinedText: "TEST",
      }),
    };

    History.mockImplementation(function (data) {
      this.patientId = data.patientId;
      this.detectedText = data.detectedText;
      this.refinedText = data.refinedText;
      this.save = mockRecord.save;
      return this;
    });

    await createHistory("patient_001", "TEST");

    expect(History).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient_001",
        detectedText: "TEST",
      }),
    );
  });
});

describe("HistoryService - Query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should get history by patientId", async () => {
    const mockRecords = [
      { patientId: "patient_001", detectedText: "AKUMULASI" },
      { patientId: "patient_001", detectedText: "SAKIT" },
    ];

    History.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockRecords),
      }),
    });

    const result = await getHistoryByPatient("patient_001");

    expect(result).toEqual(mockRecords);
    expect(History.find).toHaveBeenCalledWith({ patientId: "patient_001" });
  });

  test("should reject missing patientId in getHistoryByPatient", async () => {
    await expect(getHistoryByPatient(null)).rejects.toThrow(
      "patientId is required",
    );
  });

  test("should get all history with limit", async () => {
    const mockRecords = [
      { patientId: "patient_001", detectedText: "AKUMULASI" },
      { patientId: "patient_002", detectedText: "PUSING" },
    ];

    History.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockRecords),
      }),
    });

    const result = await getAllHistory(100);

    expect(result).toEqual(mockRecords);
  });

  test("should handle empty results", async () => {
    History.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await getHistoryByPatient("patient_nonexistent");

    expect(result).toEqual([]);
  });

  test("should handle query error", async () => {
    History.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error("Query Error")),
      }),
    });

    await expect(getHistoryByPatient("patient_001")).rejects.toThrow(
      "Query Error",
    );
  });
});

describe("HistoryService - Delete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should delete history by patientId", async () => {
    History.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

    const result = await deleteHistoryByPatient("patient_001");

    expect(result.deletedCount).toBe(5);
    expect(History.deleteMany).toHaveBeenCalledWith({
      patientId: "patient_001",
    });
  });

  test("should reject missing patientId in delete", async () => {
    await expect(deleteHistoryByPatient(null)).rejects.toThrow(
      "patientId is required",
    );
  });

  test("should handle delete error", async () => {
    History.deleteMany = jest.fn().mockRejectedValue(new Error("Delete Error"));

    await expect(deleteHistoryByPatient("patient_001")).rejects.toThrow(
      "Delete Error",
    );
  });

  test("should handle zero deleted records", async () => {
    History.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

    const result = await deleteHistoryByPatient("patient_nonexistent");

    expect(result.deletedCount).toBe(0);
  });
});

describe("HistoryService - Data Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should store metadata correctly", async () => {
    const mockRecord = {
      save: jest.fn().mockResolvedValue({}),
    };

    History.mockImplementation((data) => {
      expect(data.patientId).toBe("patient_001");
      expect(data.detectedText).toBe("TEST");
      expect(data.frameCount).toBe(4);
      expect(data.createdAt).toBeDefined();
      expect(data.processedAt).toBeDefined();
      return mockRecord;
    });

    await createHistory("patient_001", "TEST", null, 4);

    expect(History).toHaveBeenCalled();
  });

  test("should handle special characters in text", async () => {
    const specialText = "AKUMULASI-PUSING!@#$%^&*()";

    const mockRecord = {
      save: jest.fn().mockResolvedValue({
        detectedText: specialText,
      }),
    };

    History.mockImplementation(() => mockRecord);

    const result = await createHistory("patient_001", specialText);

    expect(result.detectedText).toBe(specialText);
  });

  test("should handle very long text", async () => {
    const longText = "A".repeat(10000);

    const mockRecord = {
      save: jest.fn().mockResolvedValue({
        detectedText: longText,
      }),
    };

    History.mockImplementation(() => mockRecord);

    const result = await createHistory("patient_001", longText);

    expect(result.detectedText.length).toBe(10000);
  });
});
