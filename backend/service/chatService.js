import Chat from "../database/chat.schema.js";
import createLogger from "../logger.js";

const logger = createLogger("ChatService");

/**
 * Create a new chat session for a patient.
 */
export const createChat = async (patientName) => {
  try {
    if (!patientName) {
      throw new Error("patientName is required");
    }

    const chat = new Chat({
      patientName,
      messages: [],
    });

    const saved = await chat.save();
    logger.info(`Chat session created for patient: ${patientName}`);
    return saved;
  } catch (error) {
    logger.error(
      `Failed to create chat for patient ${patientName}:`,
      error.message,
    );
    throw error;
  }
};

/**
 * Add a message to an existing chat session.
 * @param {string} chatId - The chat document _id
 * @param {"patient"|"ai"|"doctor"} sender
 * @param {string} message
 */
export const addMessage = async (chatId, sender, message) => {
  try {
    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!sender) {
      throw new Error("sender is required");
    }

    if (!message) {
      throw new Error("message is required");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error(`Chat not found for id: ${chatId}`);
    }

    chat.messages.push({ sender, message, timestamp: new Date() });
    const saved = await chat.save();

    logger.debug(
      `Message added to chat ${chatId} by ${sender}: "${message.substring(0, 50)}..."`,
    );
    return saved;
  } catch (error) {
    logger.error(`Failed to add message to chat ${chatId}:`, error.message);
    throw error;
  }
};

/**
 * Get all chat sessions for a specific patient.
 * @param {string} patientName
 */
export const getChatsByPatient = async (patientName) => {
  try {
    if (!patientName) {
      throw new Error("patientName is required");
    }

    const chats = await Chat.find({ patientName })
      .sort({ "messages.timestamp": -1 })
      .limit(100); // Prevent loading massive datasets

    logger.debug(
      `Retrieved ${chats.length} chat sessions for patient: ${patientName}`,
    );
    return chats;
  } catch (error) {
    logger.error(
      `Failed to get chats for patient ${patientName}:`,
      error.message,
    );
    throw error;
  }
};

/**
 * Get a single chat session by its ID.
 * @param {string} chatId
 */
export const getChatById = async (chatId) => {
  try {
    if (!chatId) {
      throw new Error("chatId is required");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error(`Chat not found for id: ${chatId}`);
    }

    logger.debug(`Retrieved chat session: ${chatId}`);
    return chat;
  } catch (error) {
    logger.error(`Failed to get chat ${chatId}:`, error.message);
    throw error;
  }
};

/**
 * Get all chat sessions (admin use).
 * @param {number} limit
 */
export const getAllChats = async (limit = 100) => {
  try {
    const chats = await Chat.find().sort({ _id: -1 }).limit(limit);

    logger.debug(`Retrieved ${chats.length} total chat sessions`);
    return chats;
  } catch (error) {
    logger.error("Failed to get all chats:", error.message);
    throw error;
  }
};

/**
 * Delete all chat sessions belonging to a patient.
 * @param {string} patientName
 */
export const deleteChatsByPatient = async (patientName) => {
  try {
    if (!patientName) {
      throw new Error("patientName is required");
    }

    const result = await Chat.deleteMany({ patientName });
    logger.info(
      `Deleted ${result.deletedCount} chat sessions for patient: ${patientName}`,
    );
    return result;
  } catch (error) {
    logger.error(
      `Failed to delete chats for patient ${patientName}:`,
      error.message,
    );
    throw error;
  }
};

/**
 * Delete a single chat session by its ID.
 * @param {string} chatId
 */
export const deleteChatById = async (chatId) => {
  try {
    if (!chatId) {
      throw new Error("chatId is required");
    }

    const result = await Chat.findByIdAndDelete(chatId);
    if (!result) {
      throw new Error(`Chat not found for id: ${chatId}`);
    }

    logger.info(`Deleted chat session: ${chatId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to delete chat ${chatId}:`, error.message);
    throw error;
  }
};

export default {
  createChat,
  addMessage,
  getChatById,
  getChatsByPatient,
  getAllChats,
  deleteChatsByPatient,
  deleteChatById,
};
