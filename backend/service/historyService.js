import History from "../database/history.schema.js";
import createLogger from "../logger.js";

const logger = createLogger("HistoryService");

export const createHistory = async (
  patientName,
  detectedText,
  refinedText = null,
  frameCount = 0,
) => {
  try {
    if (!patientName) {
      throw new Error("patientName is required");
    }

    if (!detectedText) {
      throw new Error("detectedText is required");
    }

    const record = new History({
      patientName,
      detectedText,
      refinedText: refinedText || detectedText,
      frameCount,
      createdAt: new Date(),
      processedAt: new Date(),
    });

    const saved = await record.save();
    logger.info(
      `History saved for patient ${patientName}: "${detectedText.substring(0, 50)}..."`,
    );
    return saved;
  } catch (error) {
    logger.error(
      `Failed to save history for patient ${patientName}:`,
      error.message,
    );
    throw error; // Propagate error for caller to handle
  }
};

export const getHistoryByPatient = async (patientName) => {
  try {
    if (!patientName) {
      throw new Error("patientName is required");
    }

    const history = await History.find({ patientName: patientName })
      .sort({ createdAt: -1 })
      .limit(100); // Prevent loading massive datasets

    logger.debug(
      `Retrieved ${history.length} history records for patient ${patientName}`,
    );
    return history;
  } catch (error) {
    logger.error(
      `Failed to get history for patient ${patientName}:`,
      error.message,
    );
    throw error;
  }
};

export const getAllHistory = async (limit = 100) => {
  try {
    const history = await History.find().sort({ createdAt: -1 }).limit(limit);

    logger.debug(`Retrieved ${history.length} total history records`);
    return history;
  } catch (error) {
    logger.error("Failed to get all history:", error.message);
    throw error;
  }
};

export const deleteHistoryByPatient = async (patientId) => {
  try {
    if (!patientId) {
      throw new Error("patientId is required");
    }

    const result = await History.deleteMany({ patientId });
    logger.info(
      `Deleted ${result.deletedCount} records for patient ${patientId}`,
    );
    return result;
  } catch (error) {
    logger.error(
      `Failed to delete history for patient ${patientId}:`,
      error.message,
    );
    throw error;
  }
};

export default {
  createHistory,
  getHistoryByPatient,
  getAllHistory,
  deleteHistoryByPatient,
};
