import { useState, useCallback } from "react";
import type { ChatSession, MessageSender } from "../components/chatPanel";
import { wsToHttpBaseUrl } from "../lib/connection";

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────

const getBaseUrl = (serverUrl: string) => wsToHttpBaseUrl(serverUrl);

async function apiCreateChat(
  serverUrl: string,
  patientName: string,
): Promise<ChatSession> {
  console.log("[apiCreateChat] request", { serverUrl, patientName });
  const res = await fetch(`${getBaseUrl(serverUrl)}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientName }),
  });
  console.log("[apiCreateChat] response", res);
  if (!res.ok) throw new Error(`Failed to create chat: ${res.statusText}`);
  return res.json();
}

async function apiAddMessage(
  serverUrl: string,
  chatId: string,
  sender: MessageSender,
  message: string,
): Promise<ChatSession> {
  const res = await fetch(
    `${getBaseUrl(serverUrl)}/api/chat/${chatId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender, message }),
    },
  );
  if (!res.ok) throw new Error(`Failed to add message: ${res.statusText}`);
  return res.json();
}

async function apiGetChatsByPatient(
  serverUrl: string,
  patientName: string,
): Promise<ChatSession[]> {
  const res = await fetch(
    `${getBaseUrl(serverUrl)}/api/chat/patient/${encodeURIComponent(patientName)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch chats: ${res.statusText}`);
  const data = await res.json();
  return data.data ?? [];
}

async function apiDeleteChat(serverUrl: string, chatId: string): Promise<void> {
  const res = await fetch(`${getBaseUrl(serverUrl)}/api/chat/${chatId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete chat: ${res.statusText}`);
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

interface UseChatOptions {
  serverUrl: string;
  patientName: string;
}

export function useChat({ serverUrl, patientName }: UseChatOptions) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  /** Create a new chat session for the current patient. */
  const newSession = useCallback(async () => {
    if (!patientName) {
      setError("Patient name is required to start a chat session");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const created = await apiCreateChat(serverUrl, patientName);
      // Normalise timestamps
      created.messages = (created.messages ?? []).map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setSession(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, patientName]);

  /** Send a message in the active session, auto-creating one if needed. */
  const sendMessage = useCallback(
    async (message: string, sender: MessageSender) => {
      setIsLoading(true);
      setError(null);
      console.log("[useChat] sendMessage dipanggil", {
        message,
        sender,
        session,
      });
      try {
        // Auto-create session jika belum ada
        let activeSession = session;
        if (!activeSession) {
          if (!patientName) {
            setError("Patient name is required to start a chat session");
            return;
          }
          const created = await apiCreateChat(serverUrl, patientName);
          created.messages = (created.messages ?? []).map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setSession(created);
          activeSession = created;
        }

        const updated = await apiAddMessage(
          serverUrl,
          activeSession._id,
          sender,
          message,
        );
        updated.messages = (updated.messages ?? []).map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setSession(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl, session, patientName],
  );

  /** Load the most recent chat session for the current patient. */
  const loadLatestSession = useCallback(async () => {
    if (!patientName) return;
    setIsLoading(true);
    setError(null);
    try {
      const chats = await apiGetChatsByPatient(serverUrl, patientName);
      if (chats.length > 0) {
        const latest = chats[0];
        latest.messages = (latest.messages ?? []).map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setSession(latest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, patientName]);

  /** Delete the active chat session. */
  const deleteSession = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      await apiDeleteChat(serverUrl, session._id);
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, session]);

  return {
    session,
    isLoading,
    error,
    clearError,
    newSession,
    sendMessage,
    loadLatestSession,
    deleteSession,
  };
}
