import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "speaking" | "listening";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  speaking: "Speaking",
  listening: "Listening…",
};

/**
 * The animated voice presence — a sun-like orb that visibly shifts between
 * idle, thinking, speaking and listening so the conversation feels alive.
 */
export function VoiceOrb({ state }: { state: OrbState }) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";

  return (
    <div className="flex flex-col items-center gap-2 py-5">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {(isListening || isSpeaking) && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              isListening ? "bg-sky-400" : "bg-amber-400",
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg shadow-amber-500/40 transition-all",
            isSpeaking && "animate-breathe",
            isThinking && "animate-pulse",
            isListening && "ring-4 ring-sky-300/70",
          )}
        >
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-white/60 to-transparent" />
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          isListening
            ? "text-sky-600"
            : isSpeaking
              ? "text-amber-600"
              : "text-slate-500",
        )}
      >
        {STATE_LABEL[state]}
      </span>
    </div>
  );
}
