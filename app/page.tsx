"use client";

import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { LiveCaption } from "@/components/chat/live-caption";
import { MeshBackground } from "@/components/chat/mesh-background";
import { ProgressDots } from "@/components/chat/progress-dots";
import { StartScreen } from "@/components/chat/start-screen";
import { VoiceOrb, type OrbState } from "@/components/chat/voice-orb";
import { Waveform } from "@/components/chat/waveform";
import { DataPanel } from "@/components/data-panel/data-panel";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { countFilledFields, EMPTY_COLLECTED, FIELD_KEYS } from "@/lib/collected";
import { INITIAL_TRIGGER_MESSAGE } from "@/lib/constants";
import type { CollectedData } from "@/lib/types";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [collected, setCollected] = useState<CollectedData>(EMPTY_COLLECTED);
  const [isComplete, setIsComplete] = useState(false);
  const [billUnknown, setBillUnknown] = useState(false);
  // Karaoke caption — tracks how far the TTS engine has spoken so the
  // <LiveCaption> can light up words in sync with the spoken word.
  const [spokenChars, setSpokenChars] = useState(0);
  const [karaokeActive, setKaraokeActive] = useState(false);
  // Surfaces the last server-side extraction failure (rate limits, network,
  // model errors) so the user sees what broke rather than wondering why
  // their answer didn't show up in the panel.
  const [extractionError, setExtractionError] = useState<string | null>(null);
  // Live partial transcript from Chrome WHILE the user is mid-utterance.
  // Cleared the instant Chrome's final result fires — gives real-time
  // capture confirmation during speech, then disappears so the UI stays
  // clean once the AI starts responding.
  const [interimTranscript, setInterimTranscript] = useState("");

  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const isCompleteRef = useRef(isComplete);
  isCompleteRef.current = isComplete;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const { messages, input, handleInputChange, setInput, append, isLoading, data } =
    useChat({ api: "/api/chat" });

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: voiceSupported,
  } = useSpeechSynthesis();
  const speakRef = useRef(speak);
  speakRef.current = speak;

  const sendMessage = useCallback(
    (text: string, alternatives: string[] = []) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // When Chrome's STT supplies multiple candidate transcripts, append
      // them to the message so the LLM can recover from a mis-hear on the
      // primary (e.g. "terrorist" → "terraced"). Stripped before display.
      const content =
        alternatives.length > 0
          ? `${trimmed} [STT alts: ${alternatives
              .map((a) => `"${a}"`)
              .join(", ")}]`
          : trimmed;
      append(
        { role: "user", content },
        { body: { currentCollected: collectedRef.current } },
      );
    },
    [append],
  );

  // Map Chrome's recognition error codes to user-facing messages.
  // `no-speech` and `aborted` are routine (silence-timeout / intentional
  // stop) and we ignore them — the mic just closes and the hint text
  // tells the user to tap to re-engage. Other codes are real blockers
  // and get surfaced to the banner.
  const handleMicError = useCallback((errorType: string) => {
    if (errorType === "no-speech" || errorType === "aborted") return;
    const message =
      errorType === "not-allowed"
        ? "Microphone permission was blocked. Click the mic icon in the browser address bar to allow it, then refresh."
        : errorType === "audio-capture"
          ? "No microphone detected. Connect one and refresh — or just type your answer in the box below."
          : errorType === "network"
            ? "Speech recognition service unreachable (Chrome's STT needs a network connection)."
            : `Microphone error: ${errorType}`;
    setExtractionError(message);
  }, []);

  const {
    start: startListening,
    stop: stopListening,
    isListening,
    isSupported: micSupported,
  } = useSpeechRecognition({
    onResult: (primary, alternatives) => {
      // Final result landed — clear the live partial so it disappears
      // as the AI takes over the turn.
      setInterimTranscript("");
      sendMessage(primary, alternatives);
    },
    onInterim: (transcript) => setInterimTranscript(transcript),
    onError: handleMicError,
  });
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;
  const micSupportedRef = useRef(micSupported);
  micSupportedRef.current = micSupported;

  useEffect(() => {
    if (!data || data.length === 0) return;
    // Find the latest of EACH part type independently. This avoids the
    // ordering bug where finding a fallback `collected` part clears a
    // more-recently-written `extraction_error` before the user ever sees it.
    type CollectedPart = {
      collected: CollectedData;
      bill_unknown?: boolean;
      complete: boolean;
    };
    type ErrorPart = { message?: string };
    let latestCollectedIdx = -1;
    let latestErrorIdx = -1;
    let latestCollectedPart: CollectedPart | undefined;
    let latestErrorPart: ErrorPart | undefined;
    for (let i = 0; i < data.length; i++) {
      const part = data[i];
      if (!part || typeof part !== "object" || Array.isArray(part)) continue;
      if (part.type === "collected") {
        latestCollectedIdx = i;
        latestCollectedPart = part as unknown as CollectedPart;
      } else if (part.type === "extraction_error") {
        latestErrorIdx = i;
        latestErrorPart = part as unknown as ErrorPart;
      }
    }
    if (latestCollectedPart) {
      setCollected(latestCollectedPart.collected);
      setBillUnknown(Boolean(latestCollectedPart.bill_unknown));
      setIsComplete(Boolean(latestCollectedPart.complete));
    }
    // Show the error only if it's more recent than the last success — a new
    // successful extraction implicitly clears it.
    if (latestErrorPart && latestErrorIdx > latestCollectedIdx) {
      setExtractionError(
        latestErrorPart.message ?? "Extraction failed — try again.",
      );
    } else if (latestCollectedIdx > -1) {
      setExtractionError(null);
    }
  }, [data]);

  // Hard-stop the mic the instant the assessment completes. Without this,
  // if extraction's `complete: true` arrives AFTER the closing TTS finishes
  // (extraction runs server-side after chat ends, so its data part can land
  // a beat late), the mic would already have auto-opened — and the user's
  // "thank you" would reopen a conversation that's supposed to be done.
  useEffect(() => {
    if (isComplete) {
      stopListening();
      setInterimTranscript("");
    }
  }, [isComplete, stopListening]);

  const wasLoading = useRef(false);
  useEffect(() => {
    const justFinished = wasLoading.current && !isLoading;
    wasLoading.current = isLoading;
    if (!justFinished) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    if (mutedRef.current) return;

    // Light up the caption in sync with the spoken words.
    setSpokenChars(0);
    setKaraokeActive(true);

    speakRef.current(last.content, {
      onBoundary: (charIndex) => setSpokenChars(charIndex),
      onEnd: () => {
        setKaraokeActive(false);
        if (isCompleteRef.current) return;
        if (mutedRef.current) return;
        // Start recognition the instant TTS ends — no fixed timer. Chrome
        // will take ~100-300ms to actually start capturing, and the orb
        // only flips to cyan when its `onaudiostart` event fires (handled
        // in the hook). So the visible "listening" state is bound to a
        // real browser event, not a guess.
        if (micSupportedRef.current) startListeningRef.current();
      },
    });
  }, [isLoading, messages]);

  const handleStart = useCallback(
    (withVoice: boolean) => {
      setStarted(true);
      setMuted(!withVoice);
      append(
        { role: "user", content: INITIAL_TRIGGER_MESSAGE },
        { body: { currentCollected: EMPTY_COLLECTED } },
      );
    },
    [append],
  );

  const handleSend = useCallback(() => {
    if (isLoading || isComplete) return;
    const text = input;
    setInput("");
    sendMessage(text);
  }, [input, isLoading, isComplete, sendMessage, setInput]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      cancelSpeech();
      startListening();
    }
  }, [isListening, stopListening, cancelSpeech, startListening]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      if (next) {
        cancelSpeech();
        stopListening();
      }
      return next;
    });
  }, [cancelSpeech, stopListening]);

  if (!started) {
    return (
      <>
        <MeshBackground />
        <StartScreen onStart={handleStart} micSupported={micSupported} />
      </>
    );
  }

  const visibleMessages = messages.slice(1);
  const lastAssistant = [...visibleMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  const captionText = lastAssistant?.content ?? "";
  // Show the typing indicator throughout the whole streaming response — the
  // caption renders only when streaming is done. That way the text doesn't
  // jitter as tokens arrive one by one.
  const showTyping = isLoading;

  let orbState: OrbState = "idle";
  if (isLoading) orbState = "thinking";
  else if (isSpeaking) orbState = "speaking";
  else if (isListening) orbState = "listening";

  const waveformState =
    orbState === "listening"
      ? "listening"
      : orbState === "speaking"
        ? "speaking"
        : "idle";

  const filledCount = countFilledFields(collected) +
    (billUnknown && collected.annual_electricity_bill_gbp === null ? 1 : 0);

  return (
    <>
      <MeshBackground />
      <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
        <DataPanel
          collected={collected}
          isComplete={isComplete}
          billUnknown={billUnknown}
          activityState={orbState}
        />

        <div className="flex min-h-0 flex-1 flex-col md:order-1">
          <ChatHeader
            muted={muted}
            onToggleMute={toggleMute}
            voiceSupported={voiceSupported}
          />

          {extractionError && (
            <div className="mx-6 mt-1 mb-1 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-300 mt-0.5 shrink-0">
                error
              </span>
              <span className="flex-1 break-words">{extractionError}</span>
              <button
                type="button"
                onClick={() => setExtractionError(null)}
                aria-label="Dismiss"
                className="shrink-0 text-red-300/70 hover:text-red-200"
              >
                ×
              </button>
            </div>
          )}

          {!isComplete && (
            <div className="px-6 pt-1 pb-2">
              <ProgressDots current={filledCount} total={FIELD_KEYS.length} />
            </div>
          )}

          <main className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-4">
            <div className="relative flex w-full max-w-2xl flex-col items-center gap-6">
              <VoiceOrb state={orbState} size={280} />

              {/* Audio waveform — sits between the orb and the caption. */}
              <Waveform
                state={waveformState}
                bars={56}
                className="w-[440px] max-w-[88vw]"
              />

              {/* Fixed-height slot so swapping dots <-> caption never shifts
                  the orb. Caption is top-aligned within the slot so its
                  height growth (longer messages) only extends downward. */}
              <div className="flex min-h-[120px] w-full items-start justify-center">
                {showTyping ? (
                  <div
                    className="flex items-center gap-1.5 pt-6"
                    aria-label="Thinking"
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-amber-400/70"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <LiveCaption
                    text={captionText}
                    charsSpoken={spokenChars}
                    karaokeActive={karaokeActive}
                  />
                )}
              </div>

              {/* Live partial transcript — only renders while Chrome is
                  decoding the user's speech in real time. Clears the moment
                  the final result lands, so the UI stays clean once the AI
                  starts responding. Gives mid-speech capture confirmation
                  without permanent visual clutter. */}
              {interimTranscript && (
                <p className="w-full max-w-xl text-center text-sm italic text-cyan-300/90">
                  &ldquo;{interimTranscript}&rdquo;
                </p>
              )}
            </div>
          </main>

          {/* State-aware hint so the user learns the orb's colour convention
              without reading docs: "speak when the orb is blue". The line
              tracks the orb state directly. Hidden when the assessment is
              complete or while we're still loading the first AI response. */}
          {!isComplete && messages.length > 1 && (
            <p className="px-6 pb-1 text-center text-xs text-white/40">
              {orbState === "thinking" ? (
                "Thinking…"
              ) : orbState === "speaking" ? (
                "Wait until the orb turns blue…"
              ) : orbState === "listening" ? (
                <>
                  <span className="mr-1.5 text-cyan-400">●</span>
                  Speak now
                </>
              ) : (
                "Tap the mic to speak"
              )}
            </p>
          )}

          <ChatComposer
            input={input}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onMicClick={handleMicClick}
            isListening={isListening}
            micSupported={micSupported}
            isLoading={isLoading}
            isComplete={isComplete}
            awaitingUser={orbState === "idle" && !isComplete && messages.length > 1}
          />
        </div>
      </div>
    </>
  );
}
