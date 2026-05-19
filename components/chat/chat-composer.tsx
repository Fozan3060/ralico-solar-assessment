"use client";

import type { ChangeEvent } from "react";
import { CheckCircle2, Mic, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  input: string;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onMicClick: () => void;
  isListening: boolean;
  micSupported: boolean;
  isLoading: boolean;
  isComplete: boolean;
};

/**
 * The input row: text field + microphone + send. Once the assessment is
 * complete it is replaced by a confirmation bar and the inputs are locked.
 */
export function ChatComposer({
  input,
  onInputChange,
  onSend,
  onMicClick,
  isListening,
  micSupported,
  isLoading,
  isComplete,
}: ChatComposerProps) {
  if (isComplete) {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-slate-200 bg-emerald-50 px-4 py-4 font-medium text-emerald-700">
        <CheckCircle2 className="h-5 w-5" />
        Assessment complete
      </div>
    );
  }

  const disabled = isLoading;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3"
    >
      <Input
        value={input}
        onChange={onInputChange}
        disabled={disabled}
        placeholder={isListening ? "Listening…" : "Type or speak your answer…"}
        aria-label="Your answer"
        className="flex-1"
      />

      {micSupported && (
        <Button
          type="button"
          size="icon"
          variant={isListening ? "destructive" : "secondary"}
          onClick={onMicClick}
          disabled={disabled}
          className={cn("shrink-0", isListening && "animate-pulse")}
          aria-label={isListening ? "Stop recording" : "Speak your answer"}
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}

      <Button
        type="submit"
        size="icon"
        disabled={disabled || input.trim().length === 0}
        className="shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
