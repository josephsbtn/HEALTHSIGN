"use client";

import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";

interface LiveTranslationProps {
  streamBuffer: string;
}

export function LiveTranslation({ streamBuffer }: LiveTranslationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll and animate new characters
  useEffect(() => {
    if (streamBuffer.length > prevLengthRef.current && containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
    prevLengthRef.current = streamBuffer.length;
  }, [streamBuffer]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
      
      <div className="relative glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Live Translation</h3>
          {streamBuffer && (
            <span className="ml-auto text-xs text-muted-foreground">
              {streamBuffer.length} characters
            </span>
          )}
        </div>

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
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm">Waiting for hand signs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
