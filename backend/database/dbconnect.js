import mongoose from "mongoose";
import createLogger from "../logger.js";

const logger = createLogger("Database");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI environment variable not set. Database connection impossible.",
      );
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    logger.info("✓ Connected to MongoDB");
    return true;
  } catch (error) {
    logger.error("✗ Error connecting to MongoDB:", error.message);
    logger.error("Database connection is required. Exiting process...");
    process.exit(1);
  }
};

// Handle disconnection
mongoose.connection.on("disconnected", () => {
  logger.warn("✗ Disconnected from MongoDB");
});

mongoose.connection.on("error", (error) => {
  logger.error("MongoDB connection error:", error.message);
});

export default connectDB;
