import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "speaking" | "listening";

type VoiceOrbProps = {
  state: OrbState;
  /** Orb diameter in px. Default 280. */
  size?: number;
};

/**
 * The hero of the page — a layered, breathing sun-orb. Three concentric
 * rings, a soft halo, a gradient core with shimmer + inset shadow, and an
 * orbital ring on the complete-style state. Colours shift per state:
 * amber for idle/speaking, cyan for listening.
 */
export function VoiceOrb({ state, size = 280 }: VoiceOrbProps) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isActive = isListening || isSpeaking;

  const ringColor = isListening
    ? "border-cyan-500/40"
    : "border-amber-400/40";
  const haloColor = isListening
    ? "bg-[radial-gradient(circle,rgba(0,217,255,0.45)_0%,transparent_70%)]"
    : "bg-[radial-gradient(circle,rgba(255,140,66,0.55)_0%,transparent_70%)]";
  const coreGradient = isListening
    ? "from-cyan-400 via-cyan-500 to-cyan-600"
    : "from-amber-300 via-amber-500 to-orange-600";
  const coreGlow = isListening
    ? "shadow-[0_0_60px_rgba(0,217,255,0.45),inset_0_-20px_40px_rgba(0,0,0,0.3)]"
    : "shadow-[0_0_70px_rgba(255,140,66,0.55),inset_0_-20px_40px_rgba(0,0,0,0.3)]";

  const coreSize = size * 0.5;
  const haloSize = coreSize * 1.6;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer rings — 3 nested, each starting at a *different* point in
          its cycle (via negative delays) so first paint shows a stable,
          mid-animation state rather than three rings synchronised at 0%. */}
      {[0, 1, 2].map((i) => {
        const ringSize = size * (0.5 + i * 0.15);
        const duration = 3 + i * 0.5;
        return (
          <span
            key={i}
            className={cn(
              "absolute rounded-full border-2 animate-orb-ring",
              ringColor,
            )}
            style={{
              width: ringSize,
              height: ringSize,
              animationDelay: `-${duration / 2 + i * 0.4}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}

      {/* Soft halo — radial gradient glow */}
      <span
        className={cn(
          "absolute rounded-full animate-orb-halo",
          haloColor,
        )}
        style={{ width: haloSize, height: haloSize }}
      />

      {/* Core orb — gradient sun, breathing, with inset shadow */}
      <div
        className={cn(
          "relative rounded-full bg-gradient-to-br transition-all",
          coreGradient,
          coreGlow,
          isSpeaking && "animate-breathe",
          isThinking && "animate-pulse",
        )}
        style={{ width: coreSize, height: coreSize }}
      >
        {/* Inner shimmer — top-left highlight */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-white/5 to-transparent animate-orb-shimmer" />
        {/* Specular bloom */}
        <span className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,0.7),transparent_55%)]" />
      </div>

      {/* Orbital ring (subtle), only when active */}
      {isActive && (
        <span
          className="absolute rounded-full border animate-orb-rotate"
          style={{
            width: coreSize * 1.8,
            height: coreSize * 1.8,
            borderColor: isListening
              ? "rgba(0,217,255,0.3)"
              : "rgba(255,140,66,0.3)",
            borderStyle: "dashed",
          }}
        >
          <span
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
            style={{
              background: isListening ? "#00d9ff" : "#ffad5c",
              boxShadow: isListening
                ? "0 0 12px rgba(0,217,255,0.8)"
                : "0 0 12px rgba(255,173,92,0.8)",
            }}
          />
        </span>
      )}
    </div>
  );
}
