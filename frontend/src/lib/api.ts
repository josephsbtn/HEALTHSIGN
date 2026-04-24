/**
 * REST API client for hand sign detection backend
 */

import { getDefaultBackendHttpUrl, wsToHttpBaseUrl } from "./connection";

export interface ServerStatus {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  activeSessions: number;
  aiRuntime?: {
    provider: "live" | "mock" | "mock-fallback" | "offline";
    fallbackActive: boolean;
    lastError: string | null;
    updatedAt: string;
  };
  config: {
    environment: string;
    useMockAI: boolean;
    enableRefinement: boolean;
    aiServiceUrl: string;
    geminiModel: string | null;
  };
}

export interface HistoryRecord {
  _id: string;
  patientName: string;
  detectedText: string;
  refinedText: string;
  frameCount: number;
  createdAt: string;
  processedAt: string;
}

export interface RefineResponse {
  original: string;
  refined: string;
}

export interface SessionInfo {
  clientId: string;
  patientId: string | null;
  frameCount: number;
  bufferLength: number;
  uptime: number;
}

const configuredHttpUrl =
  typeof import.meta.env.VITE_BACKEND_HTTP_URL === "string"
    ? import.meta.env.VITE_BACKEND_HTTP_URL.trim()
    : "";

const DEFAULT_HTTP_BASE_URL = configuredHttpUrl || getDefaultBackendHttpUrl();

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_HTTP_BASE_URL) {
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
  }

  setBaseUrl(url: string) {
    this.baseUrl = this.normalizeBaseUrl(url);
  }

  private normalizeBaseUrl(url: string) {
    return wsToHttpBaseUrl(url);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const hasBody = options.body !== undefined;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const fallback = `HTTP ${response.status}`;
      const errorBody = await response.json().catch(async () => ({
        message: await response.text().catch(() => fallback),
      }));

      const message =
        (errorBody as { error?: string; message?: string }).error ??
        (errorBody as { error?: string; message?: string }).message ??
        fallback;

      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  // ─────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────

  async getStatus(): Promise<ServerStatus> {
    return this.request<ServerStatus>("/status");
  }

  // ─────────────────────────────────────────────
  // DETECTION (single frame, for testing)
  // ─────────────────────────────────────────────

  async detectFrame(frame: string): Promise<{ alphabet: string }> {
    return this.request<{ alphabet: string }>("/detect", {
      method: "POST",
      body: JSON.stringify({ frame }),
    });
  }

  // ─────────────────────────────────────────────
  // REFINEMENT
  // ─────────────────────────────────────────────

  async refineText(text: string): Promise<RefineResponse> {
    return this.request<RefineResponse>("/refine", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  // ─────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────

  async getHistory(limit: number = 100): Promise<{
    total: number;
    data: HistoryRecord[];
  }> {
    return this.request<{ total: number; data: HistoryRecord[] }>(
      `/chat?limit=${limit}`,
    );
  }

  async getPatientHistory(patientName: string): Promise<{
    patientName: string;
    total: number;
    data: HistoryRecord[];
  }> {
    return this.request<{
      patientName: string;
      total: number;
      data: HistoryRecord[];
    }>(`/history/${encodeURIComponent(patientName)}`);
  }

  async saveHistory(params: {
    patientName: string;
    detectedText: string;
    refinedText?: string;
    frameCount?: number;
  }): Promise<HistoryRecord> {
    return this.request<HistoryRecord>("/history", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async deletePatientHistory(
    patientId: string,
  ): Promise<{ message: string; deleted: number }> {
    return this.request<{ message: string; deleted: number }>(
      `/history/${encodeURIComponent(patientId)}`,
      {
        method: "DELETE",
      },
    );
  }

  // ─────────────────────────────────────────────
  // SESSIONS (monitoring)
  // ─────────────────────────────────────────────

  async getSessions(): Promise<{ count: number; sessions: SessionInfo[] }> {
    return this.request<{ count: number; sessions: SessionInfo[] }>(
      "/sessions",
    );
  }
}

// Singleton instance
export const api = new ApiClient();

export default api;
