"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Hand, Settings } from "lucide-react";
import { CameraPanel } from "./components/camera-panel";
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
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [patientId, setPatientId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 gradient-mint-teal rounded-2xl flex items-center justify-center shadow-lg glow-mint">
                <Hand className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Hand Sign Detection
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time communication for deaf patients
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-xl hover:bg-muted transition-all duration-200 hover:scale-105"
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

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <CameraPanel
              onFrame={handleFrame}
              onStop={handleStop}
              isConnected={isConnected}
              isProcessing={isProcessing}
            />
          </div>

          <div className="space-y-6">
            <LiveTranslation
              streamBuffer={streamBuffer}
              isConnected={isConnected}
              isProcessing={isProcessing}
              error={errorMessage}
            />

            <FinalResult
              latest={latest}
              isProcessing={isProcessing}
              streamBuffer={streamBuffer}
            />

            <HistoryPanel history={history} />
          </div>
        </div>
      </main>

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
