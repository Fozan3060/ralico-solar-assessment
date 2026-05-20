"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LANG } from "@/lib/constants";

/**
 * Thin wrapper over the browser's `speechSynthesis` API (text → speech) — this
 * is what gives the assistant a voice. `speak()` takes an optional `onEnd`
 * callback, which the call loop uses to know when to start listening again.
 *
 * Two safety nets sit on top of the raw API, because Chrome's `onend` event
 * can silently fail to fire (especially after canceled speech):
 *  - a poller that watches `speechSynthesis.speaking` and fires `onEnd` the
 *    moment it flips back to false;
 *  - a hard timeout so the call loop can never stall indefinitely.
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

    // Voices load asynchronously — prefer a UK English voice when available.
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

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel(); // drop anything already queued

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
      onEnd?.();
    };

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = complete;
    utterance.onerror = complete;

    // Safety net 1: poll for the end. Chrome occasionally drops `onend`
    // silently — watching `speechSynthesis.speaking` catches that.
    endPoller = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        speakingObserved = true;
      } else if (speakingObserved) {
        complete();
      }
    }, 250);

    // Safety net 2: a hard ceiling so the call loop can never stall forever.
    // ~100ms / character is generous for a normal TTS rate, then a 5s buffer.
    hardTimeout = setTimeout(complete, text.length * 100 + 5000);

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSupported, isSpeaking, speak, cancel };
}
