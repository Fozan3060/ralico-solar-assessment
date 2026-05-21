"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";

type UseVoiceLoopOptions = {
  /** From `useChat` — true while the AI is streaming its response. */
  isLoading: boolean;
  /** The latest assistant message text — spoken when isLoading flips false. */
  latestAssistantMessage: string;
  /** False when the conversation is complete — closes the mic, stops the loop. */
  enabled: boolean;
  /** User's mute toggle — silences TTS and closes the mic. */
  muted: boolean;
  /** Fired with the user's transcribed utterance + Chrome STT alternatives. */
  onUserMessage: (primary: string, alternatives: string[]) => void;
  /** Fired with a user-facing mic error message. */
  onMicError: (message: string) => void;
};

function micErrorMessage(errorType: string): string {
  switch (errorType) {
    case "not-allowed":
      return "Microphone permission was blocked. Click the mic icon in the browser address bar to allow it, then refresh.";
    case "audio-capture":
      return "No microphone detected. Connect one and refresh — or just type your answer in the box below.";
    case "network":
      return "Speech recognition service unreachable (Chrome's STT needs a network connection).";
    default:
      return `Microphone error: ${errorType}`;
  }
}

/**
 * Bundles TTS + STT + the speak-then-listen call loop into one place so
 * `page.tsx` doesn't have to manage the state-mirroring refs and effects.
 *
 *  - When the AI's streaming reply finishes, speak it via TTS (with
 *    karaoke-style word-boundary tracking)
 *  - When TTS finishes, reopen the mic for the user's reply
 *  - When `enabled` flips false (conversation complete), close the mic
 *  - Routine `no-speech` / `aborted` recognition errors are ignored;
 *    real ones (`not-allowed`, `audio-capture`, `network`) surface via
 *    `onMicError` as user-facing strings.
 */
export function useVoiceLoop({
  isLoading,
  latestAssistantMessage,
  enabled,
  muted,
  onUserMessage,
  onMicError,
}: UseVoiceLoopOptions) {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [spokenChars, setSpokenChars] = useState(0);
  const [karaokeActive, setKaraokeActive] = useState(false);

  // Refs read inside async TTS callbacks so they always see latest values.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: voiceSupported,
  } = useSpeechSynthesis();
  const speakRef = useRef(speak);
  speakRef.current = speak;

  const handleMicError = useCallback(
    (errorType: string) => {
      if (errorType === "no-speech" || errorType === "aborted") return;
      onMicError(micErrorMessage(errorType));
    },
    [onMicError],
  );

  const {
    start: startListening,
    stop: stopListening,
    isListening,
    isSupported: micSupported,
  } = useSpeechRecognition({
    onResult: (primary, alternatives) => {
      setInterimTranscript("");
      onUserMessage(primary, alternatives);
    },
    onInterim: setInterimTranscript,
    onError: handleMicError,
  });
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;
  const micSupportedRef = useRef(micSupported);
  micSupportedRef.current = micSupported;

  // Conversation just finished — close the mic and clear the partial.
  useEffect(() => {
    if (!enabled) {
      stopListening();
      setInterimTranscript("");
    }
  }, [enabled, stopListening]);

  // When streaming finishes, speak the latest assistant message; when TTS
  // ends, reopen the mic for the user's reply.
  const wasLoading = useRef(false);
  useEffect(() => {
    const justFinished = wasLoading.current && !isLoading;
    wasLoading.current = isLoading;
    if (!justFinished) return;
    if (!latestAssistantMessage) return;
    if (mutedRef.current) return;

    setSpokenChars(0);
    setKaraokeActive(true);

    speakRef.current(latestAssistantMessage, {
      onBoundary: (charIndex) => setSpokenChars(charIndex),
      onEnd: () => {
        setKaraokeActive(false);
        if (!enabledRef.current) return;
        if (mutedRef.current) return;
        if (micSupportedRef.current) startListeningRef.current();
      },
    });
  }, [isLoading, latestAssistantMessage]);

  return {
    isListening,
    isSpeaking,
    micSupported,
    voiceSupported,
    interimTranscript,
    spokenChars,
    karaokeActive,
    startListening,
    stopListening,
    cancelSpeech,
  };
}
