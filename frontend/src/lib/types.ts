export interface HistoryEntry {
  id: number;
  text: string;
  originalText: string;
  frameCount: number;
  duration: number;
  timestamp: Date;
}

export interface StreamMessage {
  type: "stream";
  alphabet: string;
  timestamp?: string;
}

export interface FinalMessage {
  type: "final";
  text: string;
  metadata: {
    originalText: string;
    frameCount: number;
    duration: number;
  };
  timestamp?: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  details?: string;
  timestamp?: string;
}

export type ServerMessage = StreamMessage | FinalMessage | ErrorMessage;