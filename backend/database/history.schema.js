import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      index: true,
    },
    detectedText: {
      type: String,
      required: true,
    },
    refinedText: {
      type: String,
      default: null,
    },
    frameCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Ensure patient history is ordered by date
HistorySchema.index({ patientName: 1, createdAt: -1 });

const History = mongoose.model("History", HistorySchema);

export default History;
