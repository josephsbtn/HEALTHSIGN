"use client";

import {
  MessageSquare,
  Clock,
  User,
  Stethoscope,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

// ─────────────────────────────────────────────
// TYPES — sesuai response /api/chat
// ─────────────────────────────────────────────

export type MessageSender = "patient" | "ai" | "doctor";

export interface ChatMessage {
  _id: string;
  sender: MessageSender;
  message: string;
  timestamp: string;
}

export interface ChatSessionRecord {
  _id: string;
  patientName: string;
  messages: ChatMessage[];
  __v: number;
}

interface HistoryPanelProps {
  sessions: ChatSessionRecord[];
  compact?: boolean;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const senderIcon = (sender: MessageSender) => {
  if (sender === "doctor") return <Stethoscope className="w-3 h-3" />;
  if (sender === "ai") return <Bot className="w-3 h-3" />;
  return <User className="w-3 h-3" />;
};

const senderLabel = (sender: MessageSender) => {
  if (sender === "doctor") return "Dokter";
  if (sender === "ai") return "AI";
  return "Pasien";
};

const senderColor = (sender: MessageSender) => {
  if (sender === "doctor") return "text-[#1d9e75]";
  if (sender === "ai") return "text-[#26a0c9]";
  return "text-muted-foreground";
};

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (ts: string) =>
  new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// ─────────────────────────────────────────────
// SESSION CARD
// ─────────────────────────────────────────────

function SessionCard({ session }: { session: ChatSessionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const lastMsg = session.messages[session.messages.length - 1];
  const firstMsg = session.messages[0];

  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
        <div className="shrink-0 w-8 h-8 rounded-full bg-[#6ddccd]/15 border border-[#6ddccd]/30 flex items-center justify-center">
          <User className="w-4 h-4 text-[#1d9e75]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {session.patientName}
          </p>
          {lastMsg ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <span className={`${senderColor(lastMsg.sender)} font-medium`}>
                {senderLabel(lastMsg.sender)}:
              </span>{" "}
              {lastMsg.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tidak ada pesan
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground">
            {firstMsg ? formatDate(firstMsg.timestamp) : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {session.messages.length} pesan
          </span>
        </div>

        <div className="shrink-0 ml-1 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Messages — expanded */}
      {expanded && (
        <div className="border-t border-border/30 divide-y divide-border/20">
          {session.messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tidak ada pesan
            </p>
          ) : (
            session.messages.map((msg) => (
              <div
                key={msg._id}
                className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/30">
                <div className={`shrink-0 mt-0.5 ${senderColor(msg.sender)}`}>
                  {senderIcon(msg.sender)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-semibold ${senderColor(msg.sender)}`}>
                      {senderLabel(msg.sender)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-snug break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function HistoryPanel({ sessions, compact = false }: HistoryPanelProps) {
  const scrollHeight = compact ? "h-[280px]" : "h-[500px]";

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">
          Belum ada riwayat konsultasi
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Riwayat chat pasien akan muncul di sini
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 pb-1">
          <Clock className="w-3 h-3" />
          <span>{sessions.length} sesi konsultasi</span>
        </div>
      )}
      <ScrollArea className={scrollHeight}>
        <div className="space-y-2 pr-1">
          {sessions.map((session) => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
