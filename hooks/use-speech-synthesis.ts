"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

export type SpeakCallbacks = {
  /** Fires as the engine reaches each word boundary (for karaoke-style captions). */
  onBoundary?: (charIndex: number) => void;
  /** Fires when speech finishes (cleanly OR via the safety-net fallback). */
  onEnd?: () => void;
};

/**
 * Thin wrapper over the browser's `speechSynthesis` API (text → speech) — this
 * is what gives the assistant a voice. `speak()` accepts optional callbacks:
 *  - `onBoundary(charIndex)` — fires at each word boundary so callers can
 *    light up text in sync with the spoken word ("karaoke" effect).
 *  - `onEnd()` — fires when speech finishes; the call loop uses this to
 *    know when to start listening again.
 *
 * Two reliability layers sit on top of the raw API: a poller that watches
 * `speechSynthesis.speaking` and fires `onEnd` if it flips back to false
 * without an `onend` event, and a hard timeout so the call loop can never
 * stall indefinitely.
 */
export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      voiceRef.current =
        voices.find((v) => v.lang === SPEECH_LANG) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0];
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, callbacks?: SpeakCallbacks) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) {
      callbacks?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.lang = voiceRef.current?.lang ?? SPEECH_LANG;
    utterance.rate = 1;
    utterance.pitch = 1;

    let finished = false;
    let speakingObserved = false;
    let endPoller: ReturnType<typeof setInterval> | null = null;
    let hardTimeout: ReturnType<typeof setTimeout> | null = null;

    const complete = () => {
      if (finished) return;
      finished = true;
      if (endPoller) clearInterval(endPoller);
      if (hardTimeout) clearTimeout(hardTimeout);
      setIsSpeaking(false);
      callbacks?.onEnd?.();
    };

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = complete;
    utterance.onerror = complete;

    // Word-boundary tracking for karaoke-style captioning. Chrome and Safari
    // fire this reliably for English text; some browsers (Firefox) don't —
    // in that case the caption simply stays dim until `onend` flips it all
    // bright at once. Harmless fallback.
    utterance.onboundary = (event) => {
      if (event.charIndex !== undefined) {
        callbacks?.onBoundary?.(event.charIndex + (event.charLength ?? 0));
      }
    };

    // Safety net 1 — poll for the end. Chrome occasionally drops `onend`
    // silently — watching `speechSynthesis.speaking` catches that.
    endPoller = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        speakingObserved = true;
      } else if (speakingObserved) {
        complete();
      }
    }, 250);

    // Safety net 2 — a hard ceiling so the call loop can never stall forever.
    hardTimeout = setTimeout(complete, text.length * 100 + 5000);

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSupported, isSpeaking, speak, cancel };
}
