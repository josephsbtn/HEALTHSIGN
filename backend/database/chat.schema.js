import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  id: {
    type: mongoose.Types.ObjectId,
    default: mongoose.Types.ObjectId,
    index: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  messages: [
    {
      sender: {
        type: String,
        enum: ["patient", "ai", "doctor"],
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Chat = mongoose.model("Chat", ChatSchema);

export default Chat;
