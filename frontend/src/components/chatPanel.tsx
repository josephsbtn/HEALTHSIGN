"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Stethoscope,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  Volume2,
  MessageSquare,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type MessageSender = "patient" | "ai" | "doctor";

export interface ChatMessage {
  sender: MessageSender;
  message: string;
  timestamp: Date;
}

export interface ChatSession {
  _id: string;
  patientName: string;
  messages: ChatMessage[];
}

interface ChatPanelProps {
  session: ChatSession | null;
  patientName?: string;
  /** Called when doctor sends a message */
  onSendMessage?: (message: string, sender: MessageSender) => Promise<void>;
  onNewSession?: () => Promise<void>;
  onDeleteSession?: () => Promise<void>;
  isLoading?: boolean;
  /** Latest sign-language detection result from patient — shown as banner */
  patientDetectedText?: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const speakText = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

const formatTime = (ts: Date) =>
  (ts instanceof Date ? ts : new Date(ts)).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// ─────────────────────────────────────────────
// PATIENT BUBBLE — sign language result
// ─────────────────────────────────────────────

function PatientBubble({
  msg,
  isLatest,
}: {
  msg: ChatMessage;
  isLatest: boolean;
}) {
  return (
    <div
      className={`flex items-end gap-2 ${isLatest ? "animate-fade-in-up" : ""}`}>
      <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1 max-w-[70%]">
        <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
          Patient · via sign language
        </span>
        <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm text-foreground leading-relaxed font-mono tracking-wide">
            {msg.message}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DOCTOR BUBBLE — shown large & clear to patient
// ─────────────────────────────────────────────

function DoctorBubble({
  msg,
  isLatest,
  onShowFull,
}: {
  msg: ChatMessage;
  isLatest: boolean;
  onShowFull: (text: string) => void;
}) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeaking(true);
    speakText(msg.message);
    setTimeout(() => setSpeaking(false), 2000);
  };

  return (
    <div
      className={`flex items-end gap-2 flex-row-reverse ${isLatest ? "animate-fade-in-up" : ""}`}>
      <div className="shrink-0 w-8 h-8 rounded-full gradient-mint-teal flex items-center justify-center shadow-md">
        <Stethoscope className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex flex-col gap-1 items-end max-w-[75%]">
        <span className="text-[10px] text-muted-foreground px-1">
          Doctor · {formatTime(msg.timestamp)}
        </span>

        {/* Main bubble */}
        <div
          className="relative group gradient-mint-teal rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-lg glow-mint cursor-pointer hover:brightness-105 transition-all"
          onClick={() => onShowFull(msg.message)}
          title="Click to show full screen for patient">
          <p className="text-base font-semibold text-primary-foreground leading-snug">
            {msg.message}
          </p>

          {/* TTS button */}
          <button
            onClick={handleSpeak}
            className="absolute -bottom-3 -left-2 p-1.5 rounded-full bg-card border border-border shadow-md text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
            title="Read aloud">
            <Volume2 className={`w-3 h-3 ${speaking ? "animate-pulse" : ""}`} />
          </button>
        </div>

        <span className="text-[10px] text-muted-foreground/60 px-1">
          Click to show full-screen
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI BUBBLE — refined transcription
// ─────────────────────────────────────────────

function AIBubble({ msg, isLatest }: { msg: ChatMessage; isLatest: boolean }) {
  return (
    <div
      className={`flex items-end gap-2 ${isLatest ? "animate-fade-in-up" : ""}`}>
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col gap-1 max-w-[70%]">
        <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
          AI Transcription
        </span>
        <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm text-foreground leading-relaxed italic">
            {msg.message}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DATE DIVIDER
// ─────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] text-muted-foreground font-medium px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 flex-row-reverse animate-fade-in-up">
      <div className="shrink-0 w-8 h-8 rounded-full gradient-mint-teal flex items-center justify-center shadow-md">
        <Stethoscope className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="gradient-mint-teal rounded-2xl rounded-tr-sm px-5 py-3 shadow-md">
        <div className="flex gap-1 items-center">
          <span
            className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-pulse"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

function EmptyState({
  patientName,
  onNewSession,
}: {
  patientName?: string;
  onNewSession?: () => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);

  const handleNew = async () => {
    if (!onNewSession) return;
    setCreating(true);
    try {
      await onNewSession();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-mint-teal flex items-center justify-center mb-4 shadow-lg glow-mint">
        <Stethoscope className="w-8 h-8 text-primary-foreground" />
      </div>
      <h4 className="font-semibold text-foreground mb-1">
        No active consultation
      </h4>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">
        {patientName
          ? `Start a session with ${patientName} — your messages will be shown large on screen`
          : "Start a new session to begin the consultation"}
      </p>
      {onNewSession && (
        <button
          onClick={handleNew}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-mint-teal text-primary-foreground text-sm font-semibold shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 glow-mint">
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Start Consultation
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FULL-SCREEN PATIENT DISPLAY
// ─────────────────────────────────────────────

function PatientDisplayOverlay({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeaking(true);
    speakText(message);
    setTimeout(() => setSpeaking(false), 3000);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-background/98 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 cursor-pointer animate-fade-in-up"
      onClick={onClose}>
      <div className="max-w-3xl w-full text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="p-3 rounded-2xl gradient-mint-teal shadow-lg">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-medium text-muted-foreground tracking-wide">
            Doctor says:
          </span>
        </div>

        {/* The big message */}
        <p className="text-5xl sm:text-6xl font-bold text-foreground leading-tight text-balance mb-12">
          {message}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleSpeak}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl gradient-mint-teal text-primary-foreground font-semibold shadow-lg hover:scale-105 transition-transform glow-mint">
            <Volume2 className={`w-5 h-5 ${speaking ? "animate-pulse" : ""}`} />
            {speaking ? "Speaking..." : "Read Aloud"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground/60 mt-10">
          Tap anywhere or press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
            Esc
          </kbd>{" "}
          to close
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function ChatPanel({
  session,
  patientName,
  onSendMessage,
  onNewSession,
  onDeleteSession,
  isLoading = false,
  patientDetectedText,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientDisplayMsg, setPatientDisplayMsg] = useState<string | null>(
    null,
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [session?.messages?.length, isLoading]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !onSendMessage || isSending) return;

    setIsSending(true);
    const sent = text;
    setInputValue("");
    try {
      await onSendMessage(sent, "doctor");
      // Auto-show full-screen display for the patient
      setPatientDisplayMsg(sent);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, onSendMessage, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async () => {
    if (!onDeleteSession) return;
    setIsDeleting(true);
    try {
      await onDeleteSession();
    } finally {
      setIsDeleting(false);
    }
  };

  const messages = session?.messages ?? [];
  const canSend = !!inputValue.trim() && !!onSendMessage && !isSending;

  const renderMessage = (msg: ChatMessage, i: number) => {
    const isLatest = i === messages.length - 1;
    if (msg.sender === "doctor")
      return (
        <DoctorBubble
          key={i}
          msg={msg}
          isLatest={isLatest}
          onShowFull={setPatientDisplayMsg}
        />
      );
    if (msg.sender === "ai")
      return <AIBubble key={i} msg={msg} isLatest={isLatest} />;
    return <PatientBubble key={i} msg={msg} isLatest={isLatest} />;
  };

  return (
    <>
      {/* Full-screen display for the deaf patient */}
      {patientDisplayMsg && (
        <PatientDisplayOverlay
          message={patientDisplayMsg}
          onClose={() => setPatientDisplayMsg(null)}
        />
      )}

      <div className="relative rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-[500px]">
        {/* Gradient border */}
        <div className="absolute inset-0 gradient-mint-teal opacity-20 pointer-events-none" />

        <div className="relative bg-card m-[1px] rounded-[15px] flex flex-col h-full overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-mint-teal">
                <Stethoscope className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground leading-tight">
                  Consultation Chat
                </h3>
                {session ? (
                  <p className="text-xs text-muted-foreground">
                    {session.patientName} · {messages.length} message
                    {messages.length !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Doctor → Patient (deaf)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session && (
                <>
                  <Badge
                    variant="secondary"
                    className="rounded-full text-xs hidden sm:flex">
                    #{session._id.slice(-6)}
                  </Badge>
                  {onDeleteSession && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="End consultation">
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </>
              )}
              {onNewSession && (
                <button
                  onClick={onNewSession}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Patient detected text banner ── */}
          {patientDetectedText && (
            <div className="shrink-0 mx-4 mt-3 flex items-start gap-3 bg-muted/40 border border-border/40 rounded-xl px-4 py-3">
              <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">
                  Patient said (sign language)
                </p>
                <p className="text-sm text-foreground font-medium leading-snug">
                  {patientDetectedText}
                </p>
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-hidden">
            {!session ? (
              <EmptyState
                patientName={patientName}
                onNewSession={onNewSession}
              />
            ) : (
              <ScrollArea ref={scrollAreaRef} className="h-full">
                <div className="p-4 space-y-4">
                  {messages.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Consultation started
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Your messages will appear large on screen for the
                        patient to read
                      </p>
                    </div>
                  ) : (
                    <>
                      <DateDivider label="Today" />
                      {messages.map(renderMessage)}
                    </>
                  )}
                  {isLoading && <TypingIndicator />}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ── Doctor input ── */}
          <div className="shrink-0 border-t border-border/50 p-4 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Stethoscope className="w-3 h-3" />
                Doctor
              </div>
              <span className="text-xs text-muted-foreground">
                Message will be shown full-screen to patient
              </span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message to the patient..."
                disabled={isSending}
                rows={2}
                className="flex-1 resize-none rounded-xl bg-muted/40 border border-border/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-shadow"
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`
                  shrink-0 p-3 rounded-xl transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
                  ${
                    canSend
                      ? "gradient-mint-teal text-primary-foreground hover:scale-105 shadow-md glow-mint"
                      : "bg-muted text-muted-foreground"
                  }
                `}
                title="Send to patient (Enter)">
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                Enter
              </kbd>{" "}
              to send ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                Shift+Enter
              </kbd>{" "}
              new line · Click any sent message to re-display it
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
