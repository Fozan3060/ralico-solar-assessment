"use client";

import { useChat } from "ai/react";
import { useCallback, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ErrorBanner } from "@/components/chat/error-banner";
import { LiveCaption } from "@/components/chat/live-caption";
import { MeshBackground } from "@/components/chat/mesh-background";
import { ProgressDots } from "@/components/chat/progress-dots";
import { SpeakHint } from "@/components/chat/speak-hint";
import { StartScreen } from "@/components/chat/start-screen";
import { StateHint } from "@/components/chat/state-hint";
import { ThinkingDots } from "@/components/chat/thinking-dots";
import { VoiceOrb, type OrbState } from "@/components/chat/voice-orb";
import { Waveform } from "@/components/chat/waveform";
import { DataPanel } from "@/components/data-panel/data-panel";
import { useStreamingState } from "@/hooks/use-streaming-state";
import { useVoiceLoop } from "@/hooks/use-voice-loop";
import { countFilledFields, EMPTY_COLLECTED } from "@/lib/collected";
import { INITIAL_TRIGGER_MESSAGE } from "@/lib/constants";
import { FIELD_KEYS } from "@/lib/fields";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showSpeakHint, setShowSpeakHint] = useState(true);

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    append,
    isLoading,
    data,
  } = useChat({ api: "/api/chat" });
  const {
    collected,
    billUnknown,
    isComplete,
    extractionError,
    setExtractionError,
  } = useStreamingState(data);

  // Read inside `sendMessage` so the server-side safety merge always has
  // the latest floor to protect.
  const collectedRef = useRef(collected);
  collectedRef.current = collected;

  const sendMessage = useCallback(
    (text: string, alternatives: string[] = []) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // STT mishear recovery: append candidate transcripts so the LLM can
      // pick the closest valid option (e.g. "terrorist" → "terraced").
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

  const visibleMessages = messages.slice(1);
  const lastAssistant = [...visibleMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  const captionText = lastAssistant?.content ?? "";

  const {
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
  } = useVoiceLoop({
    isLoading,
    latestAssistantMessage: captionText,
    enabled: !isComplete,
    muted,
    onUserMessage: sendMessage,
    onMicError: setExtractionError,
  });

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

  const filledCount =
    countFilledFields(collected) +
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
            <ErrorBanner
              message={extractionError}
              onDismiss={() => setExtractionError(null)}
            />
          )}

          {showSpeakHint && !isComplete && filledCount === 0 && (
            <SpeakHint onDismiss={() => setShowSpeakHint(false)} />
          )}

          {!isComplete && (
            <div className="px-6 pt-1 pb-2">
              <ProgressDots current={filledCount} total={FIELD_KEYS.length} />
            </div>
          )}

          <main className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-4">
            <div className="relative flex w-full max-w-2xl flex-col items-center gap-6">
              <VoiceOrb state={orbState} size={280} />

              <Waveform
                state={waveformState}
                bars={56}
                className="w-[440px] max-w-[88vw]"
              />

              {/* Fixed-height slot so the orb doesn't shift as the caption
                  height changes between turns. */}
              <div className="flex min-h-[120px] w-full items-start justify-center">
                {isLoading ? (
                  <ThinkingDots />
                ) : (
                  <LiveCaption
                    text={captionText}
                    charsSpoken={spokenChars}
                    karaokeActive={karaokeActive}
                  />
                )}
              </div>

              {interimTranscript && (
                <p className="w-full max-w-xl text-center text-sm italic text-cyan-300/90">
                  &ldquo;{interimTranscript}&rdquo;
                </p>
              )}
            </div>
          </main>

          {!isComplete && messages.length > 1 && <StateHint state={orbState} />}

          <ChatComposer
            input={input}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onMicClick={handleMicClick}
            isListening={isListening}
            micSupported={micSupported}
            isLoading={isLoading}
            isComplete={isComplete}
            awaitingUser={
              orbState === "idle" && !isComplete && messages.length > 1
            }
          />
        </div>
      </div>
    </>
  );
}
