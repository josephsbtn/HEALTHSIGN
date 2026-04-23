"use client";

import { useState, useCallback, useEffect } from "react";
import { CameraPanel } from "./components/camera-panel";
import { LiveTranslation } from "./components/live-translation";
import { FinalResult } from "./components/final-result";
import { HistoryPanel } from "./components/history-panel";
import { StatusBar } from "./components/status-bar";
import { SettingsDialog } from "./components/settings-dialog";
import { useWebSocket } from "./hooks/useWebSocket";
import { api, type ServerStatus } from "./lib/api";
import { Hand, Settings } from "lucide-react";

export interface HistoryEntry {
  id: number;
  text: string;
  originalText: string;
  frameCount: number;
  duration: number;
  timestamp: Date;
}

export default function HandSignDetectionPage() {
  // Configuration state
  const [serverUrl, setServerUrl] = useState("ws://localhost:8000");
  const [patientId, setPatientId] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Server status state
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Translation state
  const [streamBuffer, setStreamBuffer] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // Accumulate stream buffer for tracking original text
  const streamBufferRef = useState<string>("");

  // Update API base URL when server URL changes
  useEffect(() => {
    api.setBaseUrl(serverUrl);
  }, [serverUrl]);

  // Fetch server status
  const fetchServerStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await api.getStatus();
      setServerStatus(status);
    } catch {
      setServerStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Load history from backend on mount
  useEffect(() => {
    const loadHistory = async () => {
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
        console.error("[v0] Failed to load history:", err);
      }
    };

    loadHistory();
  }, [patientId]);

  // Fetch status periodically
  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchServerStatus]);

  // WebSocket handlers
  const handleAlphabetReceived = useCallback(
    (alphabet: string) => {
      setStreamBuffer((prev) => prev + alphabet);
      streamBufferRef[1]((prev) => prev + alphabet);
    },
    [streamBufferRef],
  );

  const handleFinalReceived = useCallback(
    async (
      text: string,
      metadata: { originalText: string; frameCount: number; duration: number },
    ) => {
      const originalText = metadata.originalText || streamBufferRef[0];

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
      streamBufferRef[1]("");
      setIsProcessing(false);

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
    [streamBufferRef, patientId],
  );

  const handleError = useCallback((message: string) => {
    console.error("[v0] WebSocket error:", message);
    setIsProcessing(false);
  }, []);

  // Initialize WebSocket
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
    onError: handleError,
  });

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Camera */}
          <div className="space-y-6">
            <CameraPanel
              onFrame={handleFrame}
              onStop={handleStop}
              isConnected={isConnected}
            />
          </div>

          {/* Right Column - Translation */}
          <div className="space-y-6">
            <LiveTranslation streamBuffer={streamBuffer} />

            <FinalResult
              latest={latest}
              isProcessing={isProcessing}
              streamBuffer={streamBuffer}
            />

            <HistoryPanel history={history} />
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
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
