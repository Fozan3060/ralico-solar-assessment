"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

type UseSpeechRecognitionOptions = {
  /** Fired once with the final transcript when the user stops speaking. */
  onResult: (transcript: string) => void;
  /** Fired on any recognition error (e.g. denied mic permission, no speech). */
  onError?: () => void;
};

/**
 * Thin wrapper over the browser's `SpeechRecognition` API (speech → text).
 * Single-utterance, final-results-only — it transcribes one spoken answer and
 * stops. Reports `isSupported: false` where the API is unavailable (e.g. Firefox).
 */
export function useSpeechRecognition({
  onResult,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Keep the latest callbacks without re-creating the recognition instance.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LANG;
    recognition.interimResults = false; // only the final, confirmed transcript
    recognition.continuous = false; // stop automatically after one utterance
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onResultRef.current(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      onErrorRef.current?.();
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // start() throws if already running — safe to ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, start, stop };
}
