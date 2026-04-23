"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinalMessage, ServerMessage } from "@/lib/types";
import { getDefaultBackendWsUrl, normalizeWsUrl } from "@/lib/connection";

export interface UseWebSocketOptions {
  enabled?: boolean;
  serverUrl?: string;
  patientId?: string;
  onAlphabetReceived?: (alphabet: string) => void;
  onFinalReceived?: (text: string, meta: FinalMessage["metadata"]) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (message: string) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  latency: number | null;
  messagesReceived: number;
  reconnectCount: number;
  error: string | null;
  sendFrame: (frame: string) => void;
  sendEnd: () => void;
  reconnect: () => void;
  disconnect: () => void;
}

const DEFAULT_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000;
const FRAME_THROTTLE_MS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMessage(rawData: unknown): ServerMessage | null {
  if (typeof rawData !== "string") {
    return null;
  }

  try {
    const data: unknown = JSON.parse(rawData);
    if (!isRecord(data) || typeof data.type !== "string") {
      return null;
    }

    if (data.type === "stream" && typeof data.alphabet === "string") {
      return {
        type: "stream",
        alphabet: data.alphabet,
        timestamp:
          typeof data.timestamp === "string" ? data.timestamp : undefined,
      };
    }

    if (
      data.type === "final" &&
      typeof data.text === "string" &&
      isRecord(data.metadata)
    ) {
      return {
        type: "final",
        text: data.text,
        metadata: {
          originalText:
            typeof data.metadata.originalText === "string"
              ? data.metadata.originalText
              : "",
          frameCount:
            typeof data.metadata.frameCount === "number"
              ? data.metadata.frameCount
              : 0,
          duration:
            typeof data.metadata.duration === "number"
              ? data.metadata.duration
              : 0,
        },
        timestamp:
          typeof data.timestamp === "string" ? data.timestamp : undefined,
      };
    }

    if (data.type === "error" && typeof data.message === "string") {
      return {
        type: "error",
        message: data.message,
        details: typeof data.details === "string" ? data.details : undefined,
        timestamp:
          typeof data.timestamp === "string" ? data.timestamp : undefined,
      };
    }

    if (typeof data.alphabet === "string") {
      return {
        type: "stream",
        alphabet: data.alphabet,
        timestamp:
          typeof data.timestamp === "string" ? data.timestamp : undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function useWebSocket({
  enabled = true,
  serverUrl = getDefaultBackendWsUrl(),
  patientId,
  onAlphabetReceived,
  onFinalReceived,
  onConnectionChange,
  onError,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameThrottleRef = useRef(0);
  const pingTimestampRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onAlphabetReceivedRef = useRef(onAlphabetReceived);
  const onFinalReceivedRef = useRef(onFinalReceived);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAlphabetReceivedRef.current = onAlphabetReceived;
  }, [onAlphabetReceived]);

  useEffect(() => {
    onFinalReceivedRef.current = onFinalReceived;
  }, [onFinalReceived]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();

    const socket = wsRef.current;
    wsRef.current = null;

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close(1000, "Disconnected by client");
    }
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    const targetUrl = normalizeWsUrl(serverUrl);

    if (!targetUrl) {
      const message = "WebSocket URL is not configured";
      setError(message);
      onErrorRef.current?.(message);
      return;
    }

    const currentSocket = wsRef.current;
    if (
      currentSocket?.readyState === WebSocket.OPEN ||
      currentSocket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    shouldReconnectRef.current = true;

    try {
      const socket = new WebSocket(targetUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        setError(null);
        onConnectionChangeRef.current?.(true);

        if (patientId) {
          socket.send(JSON.stringify({ type: "connect", patientId }));
        }

        pingTimestampRef.current = Date.now();
        socket.send(JSON.stringify({ type: "ping" }));
      };

      socket.onmessage = (event) => {
        setMessagesReceived((current) => current + 1);

        const payload = parseMessage(event.data);
        if (!payload) {
          if (pingTimestampRef.current !== null) {
            setLatency(Date.now() - pingTimestampRef.current);
            pingTimestampRef.current = null;
          }
          return;
        }

        if (payload.type === "stream") {
          onAlphabetReceivedRef.current?.(payload.alphabet);
        } else if (payload.type === "final") {
          onFinalReceivedRef.current?.(payload.text, payload.metadata);
        } else if (payload.type === "error") {
          setError(payload.message);
          onErrorRef.current?.(payload.message);
        }

        if (pingTimestampRef.current !== null) {
          setLatency(Date.now() - pingTimestampRef.current);
          pingTimestampRef.current = null;
        }
      };

      socket.onerror = () => {
        const message = "WebSocket connection error";
        setError(message);
        onErrorRef.current?.(message);
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
        wsRef.current = null;

        if (!event.wasClean && shouldReconnectRef.current) {
          const attempt = reconnectAttemptRef.current + 1;
          reconnectAttemptRef.current = attempt;
          const delay = Math.min(
            DEFAULT_RECONNECT_DELAY_MS * 2 ** (attempt - 1),
            MAX_RECONNECT_DELAY_MS,
          );

          reconnectTimerRef.current = setTimeout(() => {
            setReconnectCount((current) => current + 1);
            connect();
          }, delay);
        }
      };
    } catch {
      const message = "Failed to create WebSocket connection";
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [patientId, serverUrl]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      setIsConnected(false);
      setError(null);
      return;
    }

    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      wsRef.current?.close(1000, "Component unmounted");
      wsRef.current = null;
    };
  }, [connect, clearReconnectTimer, disconnect, enabled]);

  const sendFrame = useCallback((frame: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = Date.now();
    if (now - frameThrottleRef.current < FRAME_THROTTLE_MS) {
      return;
    }

    frameThrottleRef.current = now;
    wsRef.current.send(
      JSON.stringify({
        type: "frame",
        frame,
        timestamp: now,
      }),
    );
  }, []);

  const sendEnd = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({ type: "end", timestamp: Date.now() }));
  }, []);

  const reconnect = useCallback(() => {
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    setReconnectCount((current) => current + 1);
    disconnect();
    shouldReconnectRef.current = true;
    connect();
  }, [clearReconnectTimer, connect, disconnect]);

  return {
    isConnected,
    latency,
    messagesReceived,
    reconnectCount,
    error,
    sendFrame,
    sendEnd,
    reconnect,
    disconnect,
  };
}
