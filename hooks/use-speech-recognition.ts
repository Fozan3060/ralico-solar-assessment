"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

// Web Speech API events missing from TS's default DOM types.
declare global {
  interface SpeechRecognition {
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  }
}

type UseSpeechRecognitionOptions = {
  onResult: (primary: string, alternatives: string[]) => void;
  onInterim?: (transcript: string) => void;
  onError?: (errorType: string) => void;
};

const WATCHDOG_MS = 12_000;
const END_OF_TURN_GRACE_MS = 500;
const STOP_FALLBACK_MS = 1000;
// Backup trigger for end-of-turn — fires when no new interim arrives for
// this long, in case Chrome's `onspeechend` event never fires (which it
// doesn't always do reliably, esp. on short single-word utterances).
const INTERIM_STALENESS_MS = 1500;

/**
 * Thin wrapper around the browser's `SpeechRecognition` API.
 *
 *  - `continuous: true` keeps the session alive across pauses
 *  - `interimResults: true` streams partial transcripts for live UI feedback
 *  - End-of-turn is driven by `onspeechend` + short grace, then `stop()` to
 *    commit (canonical MDN pattern)
 *  - Safety nets: watchdog for hung sessions, interim-fallback if `stop()`
 *    doesn't emit `isFinal` within `STOP_FALLBACK_MS`
 */
export function useSpeechRecognition({
  onResult,
  onInterim,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  // Flips true only when Chrome has actually started capturing
  // (`onaudiostart`), not the moment `recognition.start()` returns —
  // ~100-300ms of audio-pipeline warmup that would drop the first word.
  const [isListening, setIsListening] = useState(false);

  // ── Callback refs (kept current so async handlers always see the latest)
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  // ── Per-session state
  const latestInterimRef = useRef("");
  // Guards against double-commit when our timer and Chrome's natural
  // `isFinal` race to finalise the same session.
  const sessionFinalizedRef = useRef(false);

  // ── Watchdog (belt-and-suspenders for sessions that hang with no events)
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
    }, WATCHDOG_MS);
  }, [disarmWatchdog]);

  // ── End-of-turn: `onspeechend` → grace → `stop()` → result via `isFinal`
  const endOfTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearEndOfTurnTimer = useCallback(() => {
    if (endOfTurnTimerRef.current) {
      clearTimeout(endOfTurnTimerRef.current);
      endOfTurnTimerRef.current = null;
    }
  }, []);

  // Canonical MDN pattern: call `stop()` so Chrome flushes its pending
  // interim as a final (lands in `onresult` with alternatives). If Chrome
  // doesn't emit within the fallback window, fire the latest interim
  // ourselves (no alts) and abort.
  const commitAndEnd = useCallback(() => {
    if (sessionFinalizedRef.current) return;
    if (!latestInterimRef.current.trim()) return;
    clearEndOfTurnTimer();

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    endOfTurnTimerRef.current = setTimeout(() => {
      if (sessionFinalizedRef.current) return;
      const text = latestInterimRef.current.trim();
      if (!text) return;
      sessionFinalizedRef.current = true;
      latestInterimRef.current = "";
      onResultRef.current(text, []);
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    }, STOP_FALLBACK_MS);
  }, [clearEndOfTurnTimer]);

  // ── Recognition lifecycle (setup + handlers, torn down on unmount)
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
    recognition.interimResults = true;
    // Without this Chrome closes the session on ~5s of silence — any
    // mid-thought pause would force a fresh session.
    recognition.continuous = true;
    // Top-5 candidate transcripts; the right answer is often #2-5 when
    // Chrome's top guess is wrong on short utterances.
    recognition.maxAlternatives = 5;

    recognition.onaudiostart = () => setIsListening(true);

    recognition.onspeechstart = () => {
      disarmWatchdog();
      clearEndOfTurnTimer();
    };

    recognition.onspeechend = () => {
      if (sessionFinalizedRef.current) return;
      clearEndOfTurnTimer();
      endOfTurnTimerRef.current = setTimeout(commitAndEnd, END_OF_TURN_GRACE_MS);
    };

    recognition.onresult = (event) => {
      if (sessionFinalizedRef.current) return;
      const result = event.results[event.results.length - 1];
      if (!result) return;
      disarmWatchdog();

      if (!result.isFinal) {
        const interim = result[0]?.transcript?.trim() ?? "";
        latestInterimRef.current = interim;
        if (interim) onInterimRef.current?.(interim);
        // Backup trigger: if no more interim arrives before this fires,
        // commit anyway. Catches the case where `onspeechend` never fires.
        clearEndOfTurnTimer();
        endOfTurnTimerRef.current = setTimeout(
          commitAndEnd,
          INTERIM_STALENESS_MS,
        );
        return;
      }

      sessionFinalizedRef.current = true;
      clearEndOfTurnTimer();
      latestInterimRef.current = "";
      const candidates = Array.from(result, (alt) => alt.transcript.trim())
        .filter((c) => c.length > 0);
      const [primary, ...alternatives] = Array.from(new Set(candidates));
      if (!primary) return;
      onResultRef.current(primary, alternatives);
    };

    recognition.onerror = (event) => {
      disarmWatchdog();
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      disarmWatchdog();
      clearEndOfTurnTimer();
      setIsListening(false);
      // Safety-commit any uncommitted interim so we never lose what the
      // user said if the session ended unexpectedly.
      if (!sessionFinalizedRef.current && latestInterimRef.current.trim()) {
        const text = latestInterimRef.current.trim();
        sessionFinalizedRef.current = true;
        latestInterimRef.current = "";
        onResultRef.current(text, []);
      }
      latestInterimRef.current = "";
      sessionFinalizedRef.current = false;
    };

    recognitionRef.current = recognition;
    return () => {
      disarmWatchdog();
      clearEndOfTurnTimer();
      recognition.onaudiostart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [disarmWatchdog, clearEndOfTurnTimer, commitAndEnd]);

  // ── Public controls

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    latestInterimRef.current = "";
    sessionFinalizedRef.current = false;
    clearEndOfTurnTimer();

    const attempt = () => {
      try {
        recognition.start();
        armWatchdog();
      } catch {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      armWatchdog();
    } catch {
      // `start()` throws if the recogniser is mid-cycle from a previous
      // session. Abort, retry on the next tick.
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      setTimeout(attempt, 80);
    }
  }, [armWatchdog, clearEndOfTurnTimer]);

  const stop = useCallback(() => {
    disarmWatchdog();
    clearEndOfTurnTimer();
    // Don't lose uncommitted interim when the caller stops manually.
    if (!sessionFinalizedRef.current && latestInterimRef.current.trim()) {
      const text = latestInterimRef.current.trim();
      sessionFinalizedRef.current = true;
      latestInterimRef.current = "";
      onResultRef.current(text, []);
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [disarmWatchdog, clearEndOfTurnTimer]);

  return { isSupported, isListening, start, stop };
}
