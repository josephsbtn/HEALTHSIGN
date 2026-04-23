import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Types.ObjectId,
      default: mongoose.Types.ObjectId,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
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
HistorySchema.index({ patientId: 1, createdAt: -1 });

const History = mongoose.model("History", HistorySchema);

export default History;
