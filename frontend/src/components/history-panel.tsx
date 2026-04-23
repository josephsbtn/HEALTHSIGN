"use client";

import { Volume2, Clock, Layers, History, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry } from "@/lib/types";

interface HistoryPanelProps {
  history: HistoryEntry[];
  patientName?: string;
  /** mode compact untuk di halaman utama, false = modal penuh */
  compact?: boolean;
}

const speakText = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    window.speechSynthesis.speak(utterance);
  }
};

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <History className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground">Belum ada riwayat</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Mulai deteksi untuk membangun riwayat
      </p>
    </div>
  );
}

function HistoryItem({
  entry,
  isLatest,
}: {
  entry: HistoryEntry;
  isLatest: boolean;
}) {
  return (
    <div
      className={`group p-3 rounded-xl transition-all duration-200 hover:bg-muted/60 ${
        isLatest ? "bg-[#6ddccd]/8 border border-[#6ddccd]/25" : "bg-muted/30"
      }`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {isLatest && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#1d9e75] mb-1">
              <Sparkles className="w-2.5 h-2.5" />
              Terbaru
            </span>
          )}
          <p
            className={`font-medium text-foreground leading-snug ${
              isLatest ? "text-[#1d9e75]" : ""
            }`}>
            {entry.text}
          </p>
          {entry.originalText && entry.originalText !== entry.text && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
              {entry.originalText}
            </p>
          )}
        </div>
        <button
          onClick={() => speakText(entry.text)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#6ddccd]/15 text-muted-foreground hover:text-[#1d9e75] transition-all shrink-0"
          title="Ucapkan">
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {entry.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" />
          {entry.frameCount} frames
        </span>
        {entry.duration > 0 && <span>{entry.duration}ms</span>}
      </div>
    </div>
  );
}

export function HistoryPanel({
  history,
  patientName,
  compact = false,
}: HistoryPanelProps) {
  const scrollHeight = compact ? "h-[260px]" : "h-[400px]";

  return (
    <div className="flex flex-col h-full">
      {/* Stats — hanya di compact mode */}
      {compact && history.length > 0 && (
        <div className="flex items-center gap-3 px-1 pb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60">
            <History className="w-3 h-3" />
            {history.length} translasi
          </span>
          {patientName && (
            <span className="truncate text-muted-foreground/70">
              untuk {patientName}
            </span>
          )}
        </div>
      )}

      <ScrollArea className={scrollHeight}>
        <div className="space-y-2 pr-1">
          {history.length === 0 ? (
            <EmptyHistory />
          ) : (
            history.map((entry, i) => (
              <HistoryItem key={entry.id} entry={entry} isLatest={i === 0} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
