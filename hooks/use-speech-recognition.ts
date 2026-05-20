"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

type UseSpeechRecognitionOptions = {
  /** Fired once with the final transcript when the user stops speaking. */
  onResult: (transcript: string) => void;
  /**
   * Fired on any recognition error code (e.g. `'no-speech'`, `'not-allowed'`,
   * `'audio-capture'`, `'network'`). Also synthesised as `'no-speech'` when
   * the session ends with neither a result nor an error — Chrome does this
   * on some setups instead of firing the no-speech timeout.
   */
  onError?: (errorType: string) => void;
};

/** Belt-and-suspenders timer: if no event fires for this long, force-restart. */
const WATCHDOG_MS = 12_000;

/**
 * Thin wrapper over the browser's `SpeechRecognition` API. Single-utterance,
 * final-results-only.
 *
 * Three layers of "keep the mic effectively open":
 *  1. Caller-side auto-restart on `no-speech` (handled in `app/page.tsx`).
 *  2. **`onend` coercion** — if a session ends with no result, no error and
 *     no explicit stop, we synthesise a `no-speech` so the caller restarts.
 *     This is the case Chrome actually hits most often.
 *  3. **Watchdog** — if *no* event fires within {@link WATCHDOG_MS}, abort
 *     and synthesise a `no-speech` ourselves. Belt-and-suspenders for the
 *     rare "session totally hung" case.
 */
export function useSpeechRecognition({
  onResult,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // Per-session flags so `onend` can decide whether to coerce a restart.
  const resultEmittedRef = useRef(false);
  const errorEmittedRef = useRef(false);
  const intentionalStopRef = useRef(false);

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disarmWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);
  const armWatchdog = useCallback(() => {
    disarmWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      const recognition = recognitionRef.current;
      if (!recognition) return;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      setIsListening(false);
      onErrorRef.current?.("no-speech");
    }, WATCHDOG_MS);
  }, [disarmWatchdog]);

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
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      resultEmittedRef.current = true;
      disarmWatchdog();
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onResultRef.current(transcript);
    };
    recognition.onerror = (event) => {
      errorEmittedRef.current = true;
      disarmWatchdog();
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };
    recognition.onend = () => {
      disarmWatchdog();
      setIsListening(false);
      // Chrome quirk: sometimes the session ends with no result, no error
      // and we didn't stop it ourselves. Coerce a `no-speech` so the caller's
      // auto-restart logic fires.
      if (
        !resultEmittedRef.current &&
        !errorEmittedRef.current &&
        !intentionalStopRef.current
      ) {
        onErrorRef.current?.("no-speech");
      }
      resultEmittedRef.current = false;
      errorEmittedRef.current = false;
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    return () => {
      disarmWatchdog();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [disarmWatchdog]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    resultEmittedRef.current = false;
    errorEmittedRef.current = false;
    intentionalStopRef.current = false;
    try {
      recognition.start();
      setIsListening(true);
      armWatchdog();
    } catch {
      // start() throws if the recogniser is already running or in a stale
      // state. Abort to reset, then try once more on the next tick.
      try {
        recognition.abort();
        setTimeout(() => {
          try {
            recognition.start();
            setIsListening(true);
            armWatchdog();
          } catch {
            setIsListening(false);
          }
        }, 80);
      } catch {
        setIsListening(false);
      }
    }
  }, [armWatchdog]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    disarmWatchdog();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [disarmWatchdog]);

  return { isSupported, isListening, start, stop };
}
