import { cn } from "@/lib/utils";

type LiveCaptionProps = {
  text: string;
  /** Character index up to which the engine has spoken. 0 means none yet. */
  charsSpoken?: number;
  /** When true, render karaoke-style (dim until spoken). When false, all bright. */
  karaokeActive?: boolean;
  variant?: "assistant" | "muted";
};

/**
 * Caption shown beneath the voice orb. When `karaokeActive` is true, words
 * progressively brighten in sync with the spoken word boundaries reported
 * by the SpeechSynthesisUtterance — the spoken half is white, the rest is
 * muted. When the speech ends the caller flips `karaokeActive` off and the
 * full caption settles to bright.
 */
export function LiveCaption({
  text,
  charsSpoken = 0,
  karaokeActive = false,
  variant = "assistant",
}: LiveCaptionProps) {
  if (!text) return null;

  // Split into tokens preserving whitespace so words don't collapse.
  const tokens = text.split(/(\s+)/);
  let cursor = 0;
  const ranges = tokens.map((token) => {
    const start = cursor;
    cursor += token.length;
    return { token, start, end: cursor };
  });

  const mutedVariant = variant === "muted";

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <p className="text-balance text-xl leading-relaxed md:text-2xl">
        {ranges.map(({ token, end }, i) => {
          // Bright when karaoke is inactive (no speech tracking) OR the
          // speech has already reached the end of this token.
          const isSpoken = !karaokeActive || charsSpoken >= end;
          return (
            <span
              key={i}
              className={cn(
                "transition-colors duration-200",
                mutedVariant
                  ? "text-white/40"
                  : isSpoken
                    ? "text-white/95"
                    : "text-white/30",
              )}
            >
              {token}
            </span>
          );
        })}
      </p>
    </div>
  );
}
