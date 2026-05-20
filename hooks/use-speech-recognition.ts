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
  // With `continuous: true`, Chrome may fire multiple final results in one
  // session (the user spoke, paused, spoke again). We accumulate them and
  // fire `onResult` only after the user has been silent for `END_OF_UTTERANCE_MS`
  // — gives them room to think mid-sentence without us prematurely sending.
  const accumulatedRef = useRef("");
  const accumulatedAltsRef = useRef<string[]>([]);
  const endOfUtteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearEndOfUtteranceTimer = useCallback(() => {
    if (endOfUtteranceTimerRef.current) {
      clearTimeout(endOfUtteranceTimerRef.current);
      endOfUtteranceTimerRef.current = null;
    }
  }, []);

  const fireAccumulated = useCallback(() => {
    clearEndOfUtteranceTimer();
    const text = accumulatedRef.current.trim();
    const alts = accumulatedAltsRef.current;
    accumulatedRef.current = "";
    accumulatedAltsRef.current = [];
    if (text) onResultRef.current(text, alts);
  }, [clearEndOfUtteranceTimer]);

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
    // Continuous = true is the crucial bit. With `false`, Chrome ends the
    // session the moment it detects ~5s of silence — so any pause to think
    // closes the mic and forces a restart. With `true`, Chrome keeps the
    // same session open across pauses; we get multiple final results in
    // one session and use our own debounce timer to decide when the user
    // is actually done speaking.
    recognition.continuous = true;
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
      // In continuous mode, `event.results` accumulates across the session.
      // We always look at the newest result.
      const result = event.results[event.results.length - 1];
      if (!result) return;
      disarmWatchdog();
      if (!result.isFinal) {
        // Interim — show the user (and any prior accumulated text) live.
        const interim = result[0]?.transcript?.trim() ?? "";
        const combined = (accumulatedRef.current + " " + interim).trim();
        if (combined) onInterimRef.current?.(combined);
        return;
      }
      // Final result for one utterance. Accumulate, then debounce — if no
      // more results arrive within END_OF_UTTERANCE_MS, the user has stopped
      // and we fire onResult with everything they said.
      resultEmittedRef.current = true;
      const candidates = Array.from(result, (alt) => alt.transcript.trim())
        .filter((c) => c.length > 0);
      const [primary, ...alternatives] = Array.from(new Set(candidates));
      if (!primary) return;
      accumulatedRef.current = (
        accumulatedRef.current +
        " " +
        primary
      ).trim();
      accumulatedAltsRef.current = alternatives;
      clearEndOfUtteranceTimer();
      endOfUtteranceTimerRef.current = setTimeout(fireAccumulated, 1500);
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
      // If the session ended with accumulated-but-not-yet-fired text, fire
      // it now — don't lose what the user said.
      if (accumulatedRef.current.trim()) {
        fireAccumulated();
      }
      // Chrome quirk: sometimes the session ends with no result, no error
      // and we didn't stop it ourselves. Coerce a `no-speech` so the caller
      // can react (e.g. show "tap to speak").
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
      clearEndOfUtteranceTimer();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      recognition.onaudiostart = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [disarmWatchdog, clearEndOfUtteranceTimer, fireAccumulated]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    resultEmittedRef.current = false;
    errorEmittedRef.current = false;
    intentionalStopRef.current = false;
    speechDetectedRef.current = false;
    accumulatedRef.current = "";
    accumulatedAltsRef.current = [];
    clearEndOfUtteranceTimer();
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
  }, [armWatchdog, clearEndOfUtteranceTimer]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    disarmWatchdog();
    // If there's accumulated text waiting on the debounce, fire it now
    // before the session closes — don't lose what the user said.
    if (accumulatedRef.current.trim()) {
      fireAccumulated();
    } else {
      clearEndOfUtteranceTimer();
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [disarmWatchdog, fireAccumulated, clearEndOfUtteranceTimer]);

  return { isSupported, isListening, start, stop };
}
