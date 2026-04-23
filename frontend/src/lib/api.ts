/**
 * REST API client for hand sign detection backend
 */

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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  setBaseUrl(url: string) {
    // Convert ws:// to http:// for REST calls
    this.baseUrl = url
      .replace(/^ws:/, "http:")
      .replace(/^wss:/, "https:")
      .replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
    return this.request(`/history?limit=${limit}`);
  }

  async getPatientHistory(patientName: string): Promise<{
    patientName: string;
    total: number;
    data: HistoryRecord[];
  }> {
    return this.request(`/history/${encodeURIComponent(patientName)}`);
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
    patientId: string
  ): Promise<{ message: string; deleted: number }> {
    return this.request(`/history/${encodeURIComponent(patientId)}`, {
      method: "DELETE",
    });
  }

  // ─────────────────────────────────────────────
  // SESSIONS (monitoring)
  // ─────────────────────────────────────────────

  async getSessions(): Promise<{ count: number; sessions: SessionInfo[] }> {
    return this.request("/sessions");
  }
}

// Singleton instance
export const api = new ApiClient();

export default api;
