import { cn } from "@/lib/utils";

/**
 * Horizontal audio waveform — only visible while the assistant is speaking
 * or the user is being listened to. Fades smoothly between visible and
 * hidden so the layout never jumps. Cosine envelope (taller in the middle,
 * shorter at the edges) so it reads as a single audio peak.
 */
export function Waveform({
  state,
  bars = 56,
  className,
}: {
  state: "listening" | "speaking" | "idle";
  bars?: number;
  className?: string;
}) {
  const isActive = state === "listening" || state === "speaking";
  const colorClass = state === "listening" ? "bg-cyan-400" : "bg-amber-400";

  const center = (bars - 1) / 2;

  return (
    <div
      className={cn(
        "flex items-center justify-between transition-opacity duration-500",
        !isActive && "pointer-events-none opacity-0",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const distance = Math.abs(i - center) / center;
        const envelope = Math.cos(distance * (Math.PI / 2));
        const seed = (Math.sin(i * 2.4) + 1) / 2;

        const baseHeight = 4 + envelope * 18 + seed * 4;
        const minHeight = Math.max(3, 4 + envelope * 8);
        const maxHeight = 8 + envelope * 28 + seed * 6;

        return (
          <span
            key={i}
            className={cn(
              "w-[2px] rounded-full",
              colorClass,
              isActive && "animate-waveform",
            )}
            style={
              {
                height: `${baseHeight}px`,
                "--bar-min": `${minHeight}px`,
                "--bar-max": `${maxHeight}px`,
                animationDelay: `${(i * 0.04) % 1.2}s`,
                animationDuration: `${0.7 + seed * 0.6}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
