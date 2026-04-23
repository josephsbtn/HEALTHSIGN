"use client";

import React, { useCallback } from "react";
import { X } from "lucide-react";
import { ChatPanel, type MessageSender } from "./chatPanel";
import type { ChatSession } from "./chatPanel";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ChatSession | null;
  patientName?: string;
  onSendMessage?: (message: string, sender: MessageSender) => Promise<void>;
  onNewSession?: () => Promise<void>;
  onDeleteSession?: () => Promise<void>;
  isLoading?: boolean;
  patientDetectedText?: string;
}

export function ChatModal({
  open,
  onOpenChange,
  session,
  patientName,
  onSendMessage,
  onNewSession,
  onDeleteSession,
  isLoading = false,
  patientDetectedText,
}: ChatModalProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-md z-40 animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title">
        <div className="w-full max-w-2xl max-h-[80vh] bg-card rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up border border-border/50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
            <div className="flex-1">
              <h2
                id="chat-modal-title"
                className="font-semibold text-foreground text-lg">
                Chat Consultation
              </h2>
              {patientName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient: {patientName}
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close chat"
              title="Close (ESC)">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Chat Panel */}
          <div className="h-[calc(80vh-120px)] overflow-hidden">
            <ChatPanel
              session={session}
              patientName={patientName}
              onSendMessage={onSendMessage}
              onNewSession={onNewSession}
              onDeleteSession={onDeleteSession}
              isLoading={isLoading}
              patientDetectedText={patientDetectedText}
            />
          </div>
        </div>
      </div>
    </>
  );
}
