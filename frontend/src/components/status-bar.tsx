"use client";

import { Wifi, WifiOff, RefreshCw, Loader2, Save } from "lucide-react";
import type { ServerStatus } from "@/lib/api";

interface StatusBarProps {
  isConnected: boolean;
  latency: number | null;
  messagesReceived: number;
  reconnectCount: number;
  error: string | null;
  onReconnect: () => void;
  serverStatus: ServerStatus | null;
  isLoadingStatus: boolean;
  isSavingHistory: boolean;
}

export function StatusBar({
  isConnected,
  latency,
  messagesReceived,
  reconnectCount,
  error,
  onReconnect,
  serverStatus,
  isLoadingStatus,
  isSavingHistory,
}: StatusBarProps) {
  const aiProvider = serverStatus?.aiRuntime?.provider;
  const aiLabel =
    aiProvider === "live"
      ? "AI Live"
      : aiProvider === "mock-fallback"
        ? "AI Fallback"
        : aiProvider === "offline"
          ? "AI Offline"
        : serverStatus?.config.useMockAI
          ? "AI Mock"
          : "AI Offline";

  const aiDotClass =
    aiProvider === "live"
      ? "bg-green-500"
      : aiProvider === "mock-fallback"
        ? "bg-amber-500"
        : aiProvider === "offline"
          ? "bg-red-500"
        : serverStatus?.config.useMockAI
          ? "bg-sky-500"
          : "bg-red-500";

  const aiTooltip =
    serverStatus?.aiRuntime?.lastError ??
    (aiProvider === "live"
      ? "Using live AI service"
      : aiProvider === "mock-fallback"
        ? "Live AI unavailable, using mock fallback"
        : serverStatus?.config.useMockAI
          ? "Mock AI enabled by configuration"
          : "AI service is not responding");

  return (
    <div className="flex items-center gap-2">
      {messagesReceived > 0 && (
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {messagesReceived} frames
        </div>
      )}

      {reconnectCount > 0 && (
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          Reconnected {reconnectCount}x
        </div>
      )}

      {error && (
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium max-w-[220px] truncate">
          {error}
        </div>
      )}

      {/* Saving indicator */}
      {isSavingHistory && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/20 text-secondary text-xs font-medium">
          <Save className="w-3 h-3 animate-pulse" />
          Saving...
        </div>
      )}

      {/* Server status */}
      {serverStatus && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title={aiTooltip}>
            <span className={`w-1.5 h-1.5 rounded-full ${aiDotClass}`} />
            {aiLabel}
          </span>
        </div>
      )}

      {isLoadingStatus && (
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
      )}

      {/* Connection status pill */}
      <button
        onClick={onReconnect}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-200 hover:scale-105
          ${isConnected
            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
            : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
          }
        `}
          title={
            isConnected
              ? `Connected${latency !== null ? ` (${latency}ms)` : ""}`
              : "Click to reconnect"
          }
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connected</span>
              {latency !== null && latency > 0 && (
                <span className="text-green-600/70">{latency}ms</span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnected</span>
            <RefreshCw className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
}
