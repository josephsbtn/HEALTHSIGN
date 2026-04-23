import { useState, useCallback, useRef } from "react";

export interface UseTTSOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useTTS({
  language = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
}: UseTTSOptions = {}) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    (text: string) => {
      // Guard: TTS disabled or no text
      if (!isEnabled || !text || typeof window === "undefined") {
        return;
      }

      // Guard: speechSynthesis not available
      if (!("speechSynthesis" in window)) {
        console.warn("Speech Synthesis API not available");
        return;
      }

      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Track speaking state
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event.error);
          setIsSpeaking(false);
        };

        utteranceRef.current = utterance;

        // Speak
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Failed to speak text:", error);
        setIsSpeaking(false);
      }
    },
    [isEnabled, language, rate, pitch, volume],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
    if (isSpeaking) {
      stop();
    }
  }, [isSpeaking, stop]);

  return {
    isEnabled,
    isSpeaking,
    speak,
    stop,
    toggle,
    setIsEnabled,
  };
}
