"use client";

import type { ChangeEvent } from "react";
import { CheckCircle2, Mic, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  /** True when the AI is done and waiting on the user, but the mic isn't open. */
  awaitingUser?: boolean;
};

/**
 * Floating composer pill — mic + text input + send. Mic button has three
 * visual states:
 *   - **listening** (cyan, pulse + glow): mic is open and capturing
 *   - **awaiting user** (amber ring + pulse): system is waiting on a reply
 *     but the mic isn't currently open — draws the eye to where to click
 *   - **idle** (subtle white): nothing happening, default look
 *
 * The text-input placeholder also adapts to context.
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
  awaitingUser = false,
}: ChatComposerProps) {
  if (isComplete) {
    return (
      <div className="px-4 pb-6 pt-2">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-center gap-2 rounded-full px-5 py-3.5 font-medium text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          Assessment complete
        </div>
      </div>
    );
  }

  const disabled = isLoading;
  const placeholder = isListening
    ? "Listening…"
    : awaitingUser
      ? "Your turn — tap mic to answer or type"
      : "Tap to speak or type…";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className="px-4 pb-6 pt-2"
    >
      <div className="glass-strong mx-auto flex max-w-2xl items-center gap-2 rounded-full p-1.5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]">
        {micSupported && (
          <Button
            type="button"
            size="icon"
            onClick={onMicClick}
            disabled={disabled}
            className={cn(
              "h-10 w-10 shrink-0 rounded-full border-0 transition-all",
              isListening
                ? "animate-pulse bg-cyan-500 text-white glow-cyan"
                : awaitingUser
                  ? "animate-pulse bg-amber-500/25 text-amber-200 ring-2 ring-amber-400/50"
                  : "bg-white/[0.08] text-white/70 hover:bg-white/[0.14]",
            )}
            aria-label={isListening ? "Stop recording" : "Speak your answer"}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <input
          type="text"
          value={input}
          onChange={onInputChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Your reply"
          className="h-10 min-w-0 flex-1 rounded-full bg-transparent px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus-visible:outline-none disabled:opacity-60"
        />

        <Button
          type="submit"
          size="icon"
          disabled={disabled || input.trim().length === 0}
          className="h-10 w-10 shrink-0 rounded-full bg-amber-500 text-white shadow-[0_0_20px_rgba(255,140,66,0.45)] transition-all hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(255,140,66,0.65)] disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
