"use client";

import { History, Volume2, Clock, Layers } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry } from "@/app/page";

interface HistoryPanelProps {
  history: HistoryEntry[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      window.speechSynthesis.speak(utterance);
    }
  };

  const totalFrames = history.reduce((acc, h) => acc + h.frameCount, 0);
  const avgDuration =
    history.length > 0
      ? Math.round(history.reduce((acc, h) => acc + h.duration, 0) / history.length)
      : 0;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg bg-card">
      {/* Header with stats */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Translation History</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {history.length} entries
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-primary">{history.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Signs</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-secondary">{totalFrames}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Frames</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-foreground">
              {avgDuration > 0 ? `${avgDuration}` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Avg ms</div>
          </div>
        </div>
      </div>

      {/* History list */}
      <ScrollArea className="h-[200px]">
        <div className="p-3 space-y-2">
          {history.length > 0 ? (
            history.map((entry, index) => (
              <div
                key={entry.id}
                className={`
                  group p-3 rounded-xl transition-all duration-200
                  hover:bg-muted/70 cursor-default
                  ${index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}
                `}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-foreground truncate ${index === 0 ? "text-primary" : ""}`}>
                      {entry.text}
                    </p>
                    {entry.originalText !== entry.text && (
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        {entry.originalText}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => speakText(entry.text)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                    title="Speak"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {entry.frameCount} frames
                  </span>
                  {entry.duration > 0 && (
                    <span>{entry.duration}ms</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No translations yet</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Start detecting to build history
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
