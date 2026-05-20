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
 * Bottom-of-page composer. Glassmorphic pill that holds the text input,
 * microphone toggle, and send button. Once the conversation is complete the
 * row is replaced by a celebratory confirmation strip.
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
      <div className="flex items-center justify-center gap-2 border-t border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-4 font-medium text-emerald-300 backdrop-blur-xl">
        <CheckCircle2 className="h-5 w-5" />
        All set — we have everything we need
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
      className="border-t border-white/5 bg-white/[0.02] px-4 py-4 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <Input
          value={input}
          onChange={onInputChange}
          disabled={disabled}
          placeholder={isListening ? "Listening…" : "Type your reply…"}
          aria-label="Your reply"
          className="h-11 flex-1 rounded-full border-white/10 bg-white/[0.04] px-5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-400/40 focus-visible:ring-[3px] dark:bg-white/[0.04]"
        />

        {micSupported && (
          <Button
            type="button"
            size="icon"
            onClick={onMicClick}
            disabled={disabled}
            className={cn(
              "h-11 w-11 shrink-0 rounded-full border transition-colors",
              isListening
                ? "animate-pulse border-cyan-400/30 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                : "border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]",
            )}
            aria-label={isListening ? "Stop recording" : "Speak your answer"}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={disabled || input.trim().length === 0}
          className="h-11 w-11 shrink-0 rounded-full bg-amber-500 text-slate-950 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] transition-all hover:bg-amber-400 hover:shadow-[0_0_30px_-3px_rgba(245,158,11,0.7)] disabled:bg-white/10 disabled:text-slate-500 disabled:shadow-none"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
