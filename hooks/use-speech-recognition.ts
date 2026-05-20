"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

// Several Web Speech API events aren't in TS's default DOM types. Augment
// the interface so we can attach handlers without casting at every site.
declare global {
  interface SpeechRecognition {
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  }
}

type UseSpeechRecognitionOptions = {
  /**
   * Fired when the user stops speaking. `primary` is Chrome's top transcript
   * candidate; `alternatives` are the other candidates Chrome considered,
   * ranked by confidence (may be empty). The caller can pass `alternatives`
   * to the LLM as fallback options when `primary` is a likely mis-hear.
   */
  onResult: (primary: string, alternatives: string[]) => void;
  /**
   * Fired repeatedly while the user is mid-utterance with Chrome's running
   * best-guess transcript. Lets the caller surface real-time feedback ("you
   * said …") so the user can see capture IS happening and isn't guessing
   * whether the mic worked.
   */
  onInterim?: (transcript: string) => void;
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
  onInterim,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  // `isListening` flips true only when Chrome has actually started capturing
  // audio (i.e. `onaudiostart` fired) — NOT the moment `recognition.start()`
  // returns. The difference is ~100-300ms while Chrome warms up the audio
  // pipeline and connects to Google's STT; speaking during that window
  // drops the first word. The orb stays "thinking" amber until we're sure
  // capture is live.
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  // Per-session flags so `onend` can decide whether to coerce a restart.
  const resultEmittedRef = useRef(false);
  const errorEmittedRef = useRef(false);
  const intentionalStopRef = useRef(false);
  // True once Chrome's STT reports detected voice energy on this session.
  // Used to disarm the watchdog so we don't abort while the user is still
  // mid-sentence (the bug behind clipped first-word captures).
  const speechDetectedRef = useRef(false);

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
    // Interim results give us partial transcripts as the user speaks —
    // real-time proof that capture is happening, surfaced live in the UI.
    recognition.interimResults = true;
    recognition.continuous = false;
    // Ask Chrome for its top-5 candidate transcripts, not just the best one.
    // The top guess is often wrong on short or accented utterances (e.g.
    // "terraced" → "terrorist") but the right answer is usually in the
    // top 5 — we pass them all to the LLM, which picks the best fit.
    recognition.maxAlternatives = 5;

    // Fires when Chrome has actually started capturing audio — this is when
    // the mic is genuinely live, not the moment `start()` returned. Only
    // now is it safe to show "listening" to the user.
    recognition.onaudiostart = () => {
      setIsListening(true);
    };
    // Fires when Chrome detects voice energy. Tells us the session is
    // healthy and disarms the long-running watchdog.
    recognition.onspeechstart = () => {
      speechDetectedRef.current = true;
      disarmWatchdog();
    };
    recognition.onresult = (event) => {
      // Interim updates fire repeatedly mid-utterance; final fires once at
      // the end. Surface interims live; act on final.
      const result = event.results[event.results.length - 1];
      if (!result) return;
      if (!result.isFinal) {
        const interim = result[0]?.transcript?.trim() ?? "";
        if (interim) onInterimRef.current?.(interim);
        return;
      }
      resultEmittedRef.current = true;
      disarmWatchdog();
      const candidates = Array.from(result, (alt) => alt.transcript.trim())
        .filter((c) => c.length > 0);
      const [primary, ...alternatives] = Array.from(new Set(candidates));
      if (!primary) return;
      onResultRef.current(primary, alternatives);
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
      speechDetectedRef.current = false;
    };

    recognitionRef.current = recognition;
    return () => {
      disarmWatchdog();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      recognition.onaudiostart = null;
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
    speechDetectedRef.current = false;
    // NOTE: we deliberately do NOT setIsListening(true) here — the orb only
    // turns cyan when Chrome fires `onaudiostart`, signalling that the mic
    // is truly capturing. This prevents the "I see cyan but my first word
    // got dropped" bug.
    try {
      recognition.start();
      armWatchdog();
    } catch {
      // start() throws if the recogniser is already running or in a stale
      // state. Abort to reset, then try once more on the next tick.
      try {
        recognition.abort();
        setTimeout(() => {
          try {
            recognition.start();
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
