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

  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const isCompleteRef = useRef(isComplete);
  isCompleteRef.current = isComplete;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  // Refs for the recognition error handler to read fresh state.
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);

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
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      append(
        { role: "user", content: trimmed },
        { body: { currentCollected: collectedRef.current } },
      );
    },
    [append],
  );

  const handleRecognitionError = useCallback((errorType: string) => {
    // Only auto-restart on `no-speech` (real silence OR Chrome's silent-end
    // quirk coerced into `no-speech` by the hook). Real errors — permission
    // denied, no mic, network — should NOT loop.
    if (errorType !== "no-speech") return;
    if (
      mutedRef.current ||
      isCompleteRef.current ||
      isLoadingRef.current ||
      isSpeakingRef.current
    ) {
      return;
    }
    // Reopen the mic. Repeats as long as the user stays silent and we're
    // genuinely awaiting their reply — never "halts" on silence alone.
    setTimeout(() => {
      if (
        mutedRef.current ||
        isCompleteRef.current ||
        isLoadingRef.current ||
        isSpeakingRef.current
      ) {
        return;
      }
      if (micSupportedRef.current) startListeningRef.current();
    }, 300);
  }, []);

  const {
    start: startListening,
    stop: stopListening,
    isListening,
    isSupported: micSupported,
  } = useSpeechRecognition({
    onResult: sendMessage,
    onError: handleRecognitionError,
  });
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;
  const micSupportedRef = useRef(micSupported);
  micSupportedRef.current = micSupported;

  useEffect(() => {
    if (!data || data.length === 0) return;
    for (let i = data.length - 1; i >= 0; i--) {
      const part = data[i];
      if (
        part &&
        typeof part === "object" &&
        !Array.isArray(part) &&
        part.type === "collected"
      ) {
        const payload = part as {
          collected: CollectedData;
          bill_unknown?: boolean;
          complete: boolean;
        };
        setCollected(payload.collected);
        setBillUnknown(Boolean(payload.bill_unknown));
        setIsComplete(Boolean(payload.complete));
        return;
      }
    }
  }, [data]);

  // Keep refs in sync for the recognition error handler.
  isLoadingRef.current = isLoading;
  isSpeakingRef.current = isSpeaking;

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
            </div>
          </main>

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
