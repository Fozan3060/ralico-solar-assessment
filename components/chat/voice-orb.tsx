import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "speaking" | "listening";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  speaking: "Speaking",
  listening: "Listening…",
};

const STATE_DOT: Record<OrbState, string> = {
  idle: "bg-slate-500",
  thinking: "bg-amber-400 animate-pulse",
  speaking: "bg-amber-400 animate-pulse",
  listening: "bg-cyan-400 animate-pulse",
};

/**
 * The hero of the page — a layered, breathing sun-orb that visibly shifts
 * between idle / thinking / speaking / listening. Designed to feel alive on
 * a dark backdrop without being distracting.
 */
export function VoiceOrb({ state }: { state: OrbState }) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isActive = isListening || isSpeaking;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-64 w-64 items-center justify-center">
        {/* Ambient halo — always-on outer glow */}
        <div
          className={cn(
            "absolute h-full w-full rounded-full blur-3xl transition-colors duration-700",
            isListening
              ? "bg-cyan-500/35"
              : "bg-amber-500/35 animate-glow-pulse",
          )}
        />

        {/* Ripple rings (only when actively listening or speaking) */}
        {isActive && (
          <>
            <span
              className={cn(
                "absolute inline-block h-full w-full rounded-full border animate-ripple",
                isListening
                  ? "border-cyan-400/50"
                  : "border-amber-400/50",
              )}
              style={{ animationDelay: "0s" }}
            />
            <span
              className={cn(
                "absolute inline-block h-full w-full rounded-full border animate-ripple",
                isListening
                  ? "border-cyan-400/40"
                  : "border-amber-400/40",
              )}
              style={{ animationDelay: "0.8s" }}
            />
          </>
        )}

        {/* Slowly rotating conic ring — subtle "alive" cue */}
        <div className="absolute h-[78%] w-[78%] animate-orb-rotate rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(251,191,36,0.35),transparent_60%)] opacity-70" />

        {/* The sun core — a layered amber gradient orb */}
        <div
          className={cn(
            "relative flex h-44 w-44 items-center justify-center rounded-full shadow-[0_0_60px_-5px_rgba(245,158,11,0.7)] transition-transform",
            isSpeaking && "animate-breathe",
            isThinking && "animate-pulse",
          )}
        >
          {/* Outer gradient ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600" />
          {/* Inner darker gradient for depth */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-200/80 via-orange-500 to-amber-700" />
          {/* Specular highlight */}
          <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.65),transparent_55%)]" />
          {/* Inner shadow */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_-10px_30px_rgba(0,0,0,0.25)]" />
        </div>
      </div>

      {/* State pill */}
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-md">
        <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[state])} />
        <span className="text-xs font-medium tracking-wide text-slate-300">
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );
}
