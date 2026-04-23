"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Clock3, Play, Settings, X } from "lucide-react";
import heroImage from "./assets/ok.png";
import heroImage2 from "./assets/Thumb_up.png";
import { WebcamCapture } from "./components/webcam-capture";
import { LiveTranslation } from "./components/live-translation";
import { FinalResult } from "./components/final-result";
import { HistoryPanel } from "./components/history-panel";
import { StatusBar } from "./components/status-bar";
import { SettingsDialog } from "./components/settings-dialog";
import { useWebSocket } from "./hooks/useWebSocket";
import { api, type ServerStatus } from "./lib/api";
import type { HistoryEntry } from "./lib/types";

const DEFAULT_SERVER_URL =
  import.meta.env.VITE_BACKEND_WS_URL ?? "ws://localhost:8000";

export default function HandSignDetectionPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioningIn, setIsTransitioningIn] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientNameInput, setPatientNameInput] = useState("");
  const [patientFormError, setPatientFormError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [patientId, setPatientId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamBufferRef = useRef("");

  useEffect(() => {
    api.setBaseUrl(serverUrl);
  }, [serverUrl]);

  const fetchServerStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await api.getStatus();
      setServerStatus(status);
    } catch (err) {
      setServerStatus(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load backend status",
      );
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = patientId
        ? await api.getPatientHistory(patientId)
        : await api.getHistory(50);

      const entries: HistoryEntry[] = response.data.map((record) => ({
        id: new Date(record.createdAt).getTime(),
        text: record.refinedText,
        originalText: record.detectedText,
        frameCount: record.frameCount,
        duration: 0,
        timestamp: new Date(record.createdAt),
      }));

      setHistory(entries);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load history",
      );
    }
  }, [patientId, serverUrl]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    void fetchServerStatus();
    const interval = setInterval(() => {
      void fetchServerStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchServerStatus]);

  const handleAlphabetReceived = useCallback(
    (alphabet: string) => {
      if (!alphabet) return;

      setErrorMessage(null);
      setStreamBuffer((prev) => {
        const nextBuffer = `${prev}${alphabet}`;
        streamBufferRef.current = nextBuffer;
        return nextBuffer;
      });
    },
    [],
  );

  const handleFinalReceived = useCallback(
    async (
      text: string,
      metadata: { originalText: string; frameCount: number; duration: number },
    ) => {
      const originalText = metadata.originalText || streamBufferRef.current;

      const newEntry: HistoryEntry = {
        id: Date.now(),
        text,
        originalText,
        frameCount: metadata.frameCount,
        duration: metadata.duration,
        timestamp: new Date(),
      };

      setHistory((prev) => [newEntry, ...prev]);
      setStreamBuffer("");
      streamBufferRef.current = "";
      setIsProcessing(false);
      setErrorMessage(null);

      if (patientId) {
        setIsSavingHistory(true);
        try {
          await api.saveHistory({
            patientName: patientId,
            detectedText: originalText,
            refinedText: text,
            frameCount: metadata.frameCount,
          });
        } catch (err) {
          console.error("[v0] Failed to save history:", err);
        } finally {
          setIsSavingHistory(false);
        }
      }
    },
    [patientId],
  );

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    setIsProcessing(false);
  }, []);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    if (!isConnected) {
      setIsProcessing(false);
    }
  }, []);

  const {
    isConnected,
    latency,
    messagesReceived,
    reconnectCount,
    error,
    sendFrame,
    sendEnd,
    reconnect,
  } = useWebSocket({
    enabled: hasStarted,
    serverUrl,
    patientId: patientId || undefined,
    onAlphabetReceived: handleAlphabetReceived,
    onFinalReceived: handleFinalReceived,
    onConnectionChange: handleConnectionChange,
    onError: handleError,
  });

  useEffect(() => {
    setErrorMessage(error);
  }, [error]);

  const handleFrame = useCallback(
    (imageData: string) => {
      if (isConnected) {
        sendFrame(imageData);
      }
    },
    [isConnected, sendFrame],
  );

  const handleStop = useCallback(() => {
    if (isConnected) {
      sendEnd();
      setIsProcessing(true);
    }
  }, [isConnected, sendEnd]);

  const latest = history[0] ?? null;

  const handleStartExperience = useCallback(() => {
    setPatientNameInput(patientId);
    setPatientFormError(null);
    setShowPatientForm(true);
  }, [patientId]);

  const handlePatientNameSubmit = useCallback(() => {
    const nextPatientName = patientNameInput.trim();

    if (!nextPatientName) {
      setPatientFormError("Hey, we need to get to know the patient name first.");
      return;
    }

    setPatientFormError(null);
    setErrorMessage(null);
    setPatientId(nextPatientName);
    setIsTransitioningIn(true);
    setShowPatientForm(false);
    setTimeout(() => {
      setHasStarted(true);
    }, 350);
  }, [patientNameInput]);

  if (!hasStarted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))/0.96_50%,hsl(var(--muted))/0.85_100%)]" />

        <div className="absolute inset-0 overflow-hidden opacity-90">
          <div className="absolute left-[-6rem] top-[-5rem] h-80 w-80 rounded-full border-2 border-dashed border-[#6ddccd]/45 bg-[#6ddccd]/8 blur-[1px]" />
          <div className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-[#26a0c9]/35 bg-[#26a0c9]/8" />
          <div className="absolute left-[14%] top-[18%] h-28 w-28 rounded-full border border-[#6ddccd]/35" />
          <div className="absolute right-[18%] bottom-[14%] h-96 w-96 rounded-full border-2 border-dotted border-[#26a0c9]/45 bg-[#26a0c9]/5" />
          <div className="absolute bottom-[-4rem] left-[38%] h-72 w-72 rounded-full border border-[#6ddccd]/25" />
          <div className="absolute left-[8%] bottom-[18%] h-40 w-40 rounded-full border-2 border-[#26a0c9]/30" />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[5] hidden overflow-hidden lg:block">
          <img
            src={heroImage}
            alt="Hand sign illustration"
            className="absolute left-[-4rem] top-1/2 w-60 rounded-[1.25rem] object-cover"
            style={{ transform: "translateY(-5%) rotate(35deg)" }}
          />
          <img
            src={heroImage2}
            alt="Hand sign illustration"
            className="absolute right-[-4rem] top-1/2 w-80 rounded-[1.25rem] object-cover"
            style={{ transform: "translateY(-200%) rotate(-25deg)" }}
          />
        </div>

        {showPatientForm && (
          <div className="absolute inset-0 z-[20] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-background/35 backdrop-blur-md" />

            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#6ddccd]/35 bg-gradient-to-br from-white/90 via-[#f3fffd]/95 to-[#eefcff]/95 p-8 text-center shadow-2xl sm:p-10">
              <button
                type="button"
                onClick={() => setShowPatientForm(false)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#26a0c9]/25 bg-white/80 text-[#1d9e75] transition-colors hover:bg-white"
                aria-label="Close patient form"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-36 -translate-x-1/2 rounded-full bg-[#6ddccd]/25 blur-2xl" />
              <div className="pointer-events-none absolute -right-8 top-10 h-20 w-20 rounded-full bg-[#26a0c9]/15 blur-2xl" />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#1d9e75]/20 bg-[#9fe1cb]/35 text-2xl shadow-sm">
                🩺
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Who&apos;s the patient today?
              </h2>

              <div className="mt-6 text-left">

                <input
                  id="patient-name"
                  type="text"
                  value={patientNameInput}
                  onChange={(event) => {
                    setPatientNameInput(event.target.value);
                    if (patientFormError) {
                      setPatientFormError(null);
                    }
                  }}
                  placeholder="Patient Name"
                  autoFocus
                  className="w-full rounded-xl border border-[#26a0c9]/25 bg-white/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[#1d9e75] focus:ring-2 focus:ring-[#6ddccd]/25"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handlePatientNameSubmit();
                    }

                    if (event.key === "Escape") {
                      setShowPatientForm(false);
                    }
                  }}
                />
                {patientFormError && (
                  <p className="mt-2 text-xs font-medium text-[#b42318]">{patientFormError}</p>
                )}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePatientNameSubmit}
                  className="w-full rounded-xl bg-gradient-to-br from-[#6ddccd] to-[#26a0c9] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#26a0c9]/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className={`relative z-10 flex min-h-screen items-center justify-center px-6 transition-all duration-500 ${
            isTransitioningIn ? "opacity-0 scale-95 -translate-y-6" : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] bg-card/75 px-8 py-10 sm:px-10 sm:py-12">
            <div className="absolute left-6 top-6 h-24 w-24 rounded-full border border-[#6ddccd]/30" />
            <div className="absolute right-6 top-10 h-14 w-14 rounded-full border-2 border-dashed border-[#26a0c9]/45" />
            <div className="absolute bottom-8 left-8 h-20 w-20 rounded-full border border-[#26a0c9]/25" />
            <div className="absolute bottom-6 right-10 h-16 w-16 rounded-full border-2 border-dotted border-[#6ddccd]/40" />

            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Hand Sign Detection
              </h1>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                Start live webcam capture and stream hand signs for real-time translation.
              </p>

              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartExperience}
                  className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#6ddccd] to-[#26a0c9] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#26a0c9]/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0.5">
                    <Play className="h-4 w-4" />
                  </span>
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground animate-fade-in-up">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))/0.96_50%,hsl(var(--muted))/0.85_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
        <div className="absolute left-[-6rem] top-[-5rem] h-80 w-80 rounded-full border-2 border-dashed border-[#6ddccd]/45 bg-[#6ddccd]/8 blur-[1px]" />
        <div className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-[#26a0c9]/35 bg-[#26a0c9]/8" />
        <div className="absolute left-[14%] top-[18%] h-28 w-28 rounded-full border border-[#6ddccd]/35" />
        <div className="absolute right-[18%] bottom-[14%] h-96 w-96 rounded-full border-2 border-dotted border-[#26a0c9]/45 bg-[#26a0c9]/5" />
        <div className="absolute bottom-[-4rem] left-[38%] h-72 w-72 rounded-full border border-[#6ddccd]/25" />
        <div className="absolute left-[8%] bottom-[18%] h-40 w-40 rounded-full border-2 border-[#26a0c9]/30" />
      </div>

      <header className="sticky top-0 z-50 overflow-hidden border-b border-[#26a0c9]/15 bg-[linear-gradient(135deg,hsl(var(--background))/0.92_0%,hsl(var(--background))/0.9_50%,hsl(var(--muted))/0.78_100%)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-85">
          <div className="absolute left-[-4rem] top-[-3rem] h-32 w-32 rounded-full border border-[#6ddccd]/35 bg-[#6ddccd]/10" />
          <div className="absolute right-[10%] top-[-1.5rem] h-24 w-24 rounded-full border border-[#26a0c9]/35 bg-[#26a0c9]/10" />
          <div className="absolute left-[38%] bottom-[-2rem] h-24 w-24 rounded-full border-2 border-dotted border-[#6ddccd]/30" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 text-center">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Hand Sign Detection
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time communication for deaf patients
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <StatusBar
                isConnected={isConnected}
                latency={latency}
                messagesReceived={messagesReceived}
                reconnectCount={reconnectCount}
                error={error}
                onReconnect={reconnect}
                serverStatus={serverStatus}
                isLoadingStatus={isLoadingStatus}
                isSavingHistory={isSavingHistory}
              />

              <button
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#6ddccd]/25 bg-white/55 px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-white/75"
                title="Translation History"
              >
                <Clock3 className="h-4 w-4 text-[#26a0c9]" />
                History
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="rounded-xl border border-[#26a0c9]/20 bg-white/50 p-2.5 transition-all duration-200 hover:scale-105 hover:bg-white/70"
                title="Settings">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Connection issue</p>
                <p className="text-destructive/80">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-[#6ddccd]/25 bg-card/75 p-3 shadow-xl backdrop-blur-sm">
              <WebcamCapture
                onFrame={handleFrame}
                onStop={handleStop}
                isConnected={isConnected}
                isProcessing={isProcessing}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-[#26a0c9]/20 bg-card/75 p-3 shadow-xl backdrop-blur-sm">
              <LiveTranslation
                streamBuffer={streamBuffer}
                isConnected={isConnected}
                isProcessing={isProcessing}
                error={errorMessage}
              />
            </div>

            <div className="rounded-[1.75rem] border border-[#6ddccd]/25 bg-card/75 p-3 shadow-xl backdrop-blur-sm">
              <FinalResult
                latest={latest}
                isProcessing={isProcessing}
                streamBuffer={streamBuffer}
              />
            </div>
          </div>
        </div>
      </main>

      {showHistoryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 sm:px-6">
          <div
            className="absolute inset-0 bg-background/45 backdrop-blur-md"
            onClick={() => setShowHistoryModal(false)}
          />

          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-[#26a0c9]/25 bg-card/90 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[#26a0c9]/15 px-5 py-4 sm:px-6">
              <div className="inline-flex items-center gap-2 text-foreground">
                <Clock3 className="h-4 w-4 text-[#26a0c9]" />
                <h2 className="text-lg font-semibold">Translation History</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#26a0c9]/25 bg-white/70 text-[#1d9e75] transition-colors hover:bg-white"
                aria-label="Close translation history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              <HistoryPanel history={history} />
            </div>
          </div>
        </div>
      )}

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        serverUrl={serverUrl}
        onServerUrlChange={setServerUrl}
        patientId={patientId}
        onPatientIdChange={setPatientId}
        serverStatus={serverStatus}
        isLoadingStatus={isLoadingStatus}
        onRefreshStatus={fetchServerStatus}
      />
    </div>
  );
}
