"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreamResponse {
  type: "stream";
  alphabet: string;
  timestamp?: string;
}

interface FinalResponse {
  type: "final";
  text: string;
  metadata: {
    originalText: string;
    frameCount: number;
    duration: number;
  };
  timestamp?: string;
}

interface ErrorResponse {
  type: "error";
  message: string;
  details?: string;
  timestamp?: string;
}

type ServerMessage = StreamResponse | FinalResponse | ErrorResponse;

export interface UseWebSocketOptions {
  /** URL ws:// or wss:// to backend, e.g., "ws://localhost:8000" */
  serverUrl?: string;
  /** Patient ID sent via connect message after connection */
  patientId?: string;
  /** Called for each new alphabet from stream */
  onAlphabetReceived?: (alphabet: string) => void;
  /** Called when final refined text is received */
  onFinalReceived?: (text: string, meta: FinalResponse["metadata"]) => void;
  /** Called when error from server */
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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebSocket({
  serverUrl = "ws://localhost:8000",
  patientId,
  onAlphabetReceived,
  onFinalReceived,
  onError,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameThrottleRef = useRef<number>(0);

  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Store callbacks in refs to avoid reconnection on callback changes
  const onAlphabetReceivedRef = useRef(onAlphabetReceived);
  const onFinalReceivedRef = useRef(onFinalReceived);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAlphabetReceivedRef.current = onAlphabetReceived;
    onFinalReceivedRef.current = onFinalReceived;
    onErrorRef.current = onError;
  }, [onAlphabetReceived, onFinalReceived, onError]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);

        // Send connect message with patientId if provided
        if (patientId) {
          ws.send(JSON.stringify({ type: "connect", patientId }));
        }

        // Measure latency with manual ping
        pingTimestampRef.current = Date.now();
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = (event) => {
        // Calculate latency from round-trip ping
        if (pingTimestampRef.current !== null) {
          setLatency(Date.now() - pingTimestampRef.current);
          pingTimestampRef.current = null;
        }

        setMessagesReceived((n) => n + 1);

        try {
          const data: ServerMessage = JSON.parse(event.data as string);

          if (data.type === "stream") {
            onAlphabetReceivedRef.current?.(data.alphabet);
          } else if (data.type === "final") {
            onFinalReceivedRef.current?.(data.text, data.metadata);
          } else if (data.type === "error") {
            setError(data.message);
            onErrorRef.current?.(data.message);
          }
        } catch {
          // Ignore non-JSON messages (e.g., pong from server)
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        onErrorRef.current?.("WebSocket connection error");
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        if (!event.wasClean) {
          // Auto-reconnect after 3 seconds
          reconnectTimerRef.current = setTimeout(() => {
            setReconnectCount((n) => n + 1);
            connect();
          }, 3000);
        }
      };
    } catch (err) {
      setError("Failed to create WebSocket connection");
      onErrorRef.current?.("Failed to create WebSocket connection");
    }
  }, [serverUrl, patientId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close(1000, "Component unmounted");
    };
  }, [connect]);

  /** Send a single frame to backend (throttled to ~8-10 FPS) */
  const sendFrame = useCallback((frame: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    // Throttle to max 10 FPS (100ms between frames)
    if (now - frameThrottleRef.current < 100) return;
    frameThrottleRef.current = now;

    wsRef.current.send(JSON.stringify({ type: "frame", frame }));
  }, []);

  /** Notify backend that stream is finished */
  const sendEnd = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "end" }));
  }, []);

  /** Manual reconnect */
  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    setReconnectCount((n) => n + 1);
    connect();
  }, [connect]);

  return {
    isConnected,
    latency,
    messagesReceived,
    reconnectCount,
    error,
    sendFrame,
    sendEnd,
    reconnect,
  };
}
