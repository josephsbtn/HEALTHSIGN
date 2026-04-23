"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Radio, Wifi, WifiOff } from "lucide-react";

interface LiveTranslationProps {
  streamBuffer: string;
  isConnected?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}

export function LiveTranslation({
  streamBuffer,
  isConnected = false,
  isProcessing = false,
  error = null,
}: LiveTranslationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (streamBuffer.length > prevLengthRef.current && containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
    prevLengthRef.current = streamBuffer.length;
  }, [streamBuffer]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
      
      <div className="relative glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Live Translation</h3>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isConnected
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {isProcessing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Processing
              </span>
            )}
          </div>
          {streamBuffer && (
            <span className="ml-auto text-xs text-muted-foreground">
              {streamBuffer.length} characters
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="min-h-[60px] max-h-[100px] overflow-x-auto overflow-y-hidden flex items-center"
        >
          {streamBuffer ? (
            <div className="font-mono text-lg tracking-[0.3em] text-foreground whitespace-nowrap">
              {streamBuffer.split("").map((char, index) => (
                <span
                  key={index}
                  className={`inline-block ${
                    index === streamBuffer.length - 1
                      ? "animate-fade-in-up text-primary font-bold"
                      : ""
                  }`}
                  style={{
                    animationDelay: index === streamBuffer.length - 1 ? "0ms" : undefined,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
              <span className="inline-block w-0.5 h-6 bg-primary ml-1 animate-blink align-middle" />
            </div>
          ) : isProcessing ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm">Processing buffered signs...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm">
                {isConnected ? "Waiting for hand signs..." : "Connect to backend to start detection"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
