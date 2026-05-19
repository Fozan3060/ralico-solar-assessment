"use client";

import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageBubble } from "@/components/chat/message-bubble";
import { StartScreen } from "@/components/chat/start-screen";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { VoiceOrb, type OrbState } from "@/components/chat/voice-orb";
import { DataPanel } from "@/components/data-panel/data-panel";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { countFilledFields, EMPTY_COLLECTED } from "@/lib/collected";
import { INITIAL_TRIGGER_MESSAGE } from "@/lib/constants";
import type { CollectedData } from "@/lib/types";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [collected, setCollected] = useState<CollectedData>(EMPTY_COLLECTED);
  const [isComplete, setIsComplete] = useState(false);

  // Refs mirror state so async speech callbacks always read fresh values.
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

  // Send a user message with the latest collected state attached, so the
  // server-side safety merge always has the current floor to protect.
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

  const {
    start: startListening,
    stop: stopListening,
    isListening,
    isSupported: micSupported,
  } = useSpeechRecognition({ onResult: sendMessage });
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;
  const micSupportedRef = useRef(micSupported);
  micSupportedRef.current = micSupported;

  // Parse the custom `collected` data parts streamed from the API route.
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
          complete: boolean;
        };
        setCollected(payload.collected);
        setIsComplete(Boolean(payload.complete));
        return;
      }
    }
  }, [data]);

  // The call loop: when the assistant finishes a reply, speak it aloud — then,
  // unless the assessment is done, reopen the mic to listen for the next answer.
  const wasLoading = useRef(false);
  useEffect(() => {
    const justFinished = wasLoading.current && !isLoading;
    wasLoading.current = isLoading;
    if (!justFinished) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    if (mutedRef.current) return; // text-only mode — no voice

    speakRef.current(last.content, () => {
      if (isCompleteRef.current) return; // assessment finished — end the loop
      if (micSupportedRef.current) startListeningRef.current();
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

  // Auto-scroll the transcript to the newest message.
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!started) {
    return <StartScreen onStart={handleStart} micSupported={micSupported} />;
  }

  // messages[0] is the hidden trigger; everything after it is visible.
  const visibleMessages = messages.slice(1);
  const showTyping =
    isLoading && messages[messages.length - 1]?.role === "user";

  let orbState: OrbState = "idle";
  if (isLoading) orbState = "thinking";
  else if (isSpeaking) orbState = "speaking";
  else if (isListening) orbState = "listening";

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <DataPanel collected={collected} />

      <div className="flex min-h-0 flex-1 flex-col bg-white md:order-1">
        <ChatHeader
          filledCount={countFilledFields(collected)}
          muted={muted}
          onToggleMute={toggleMute}
          voiceSupported={voiceSupported}
        />
        <VoiceOrb state={orbState} />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {visibleMessages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
            />
          ))}
          {showTyping && <TypingIndicator />}
          <div ref={transcriptEndRef} />
        </div>

        <ChatComposer
          input={input}
          onInputChange={handleInputChange}
          onSend={handleSend}
          onMicClick={handleMicClick}
          isListening={isListening}
          micSupported={micSupported}
          isLoading={isLoading}
          isComplete={isComplete}
        />
      </div>
    </div>
  );
}
