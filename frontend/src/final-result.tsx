"use client";

import { MessageSquare, Volume2, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HistoryEntry } from "@/app/page";

interface FinalResultProps {
  latest: HistoryEntry | null;
  isProcessing: boolean;
  streamBuffer: string;
}

export function FinalResult({ latest, isProcessing, streamBuffer }: FinalResultProps) {
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl">
      {/* Gradient border effect */}
      <div className="absolute inset-0 gradient-mint-teal opacity-20" />
      
      <div className="relative bg-card m-[1px] rounded-[15px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-mint-teal">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Detected Sentence</h3>
          </div>
          
          {latest?.text && (
            <button
              onClick={() => speakText(latest.text)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-all duration-200 hover:scale-105"
            >
              <Volume2 className="w-4 h-4" />
              Speak
            </button>
          )}
        </div>

        <div className="min-h-[120px] flex flex-col items-center justify-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in-up">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Processing with AI refinement...
              </p>
              {/* Skeleton loader */}
              <div className="w-full max-w-sm space-y-2 mt-2">
                <div className="h-8 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-2/3 mx-auto animate-pulse" />
              </div>
            </div>
          ) : latest?.text ? (
            <div className="text-center w-full animate-fade-in-up">
              <p className="text-3xl font-bold text-foreground mb-4 leading-relaxed text-balance">
                {latest.text}
              </p>
              
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {latest.frameCount} frames
                </Badge>
                {latest.duration > 0 && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {latest.duration}ms
                  </Badge>
                )}
                <Badge className="rounded-full px-3 py-1 gradient-mint-teal text-primary-foreground border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Refined
                </Badge>
              </div>

              {latest.originalText && latest.originalText !== latest.text && (
                <div className="mt-4 p-3 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Original detection:</p>
                  <p className="text-sm font-mono text-muted-foreground break-all">
                    {latest.originalText}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">
                {streamBuffer 
                  ? "Stop detection to see the refined result"
                  : "Start detection to translate sign language"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
