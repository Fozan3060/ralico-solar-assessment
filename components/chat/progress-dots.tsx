import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * Dot-and-connector progress indicator at the top of the conversation.
 * Each completed step is filled amber; the connecting segments between
 * completed dots are filled too, giving a clear "you are here" rail.
 */
export function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current;
          const isActive = i === current;
          return (
            <Fragment key={i}>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full transition-colors duration-500",
                  done
                    ? "bg-amber-500 shadow-[0_0_8px_rgba(255,140,66,0.6)]"
                    : isActive
                      ? "bg-cyan-400 shadow-[0_0_10px_rgba(0,217,255,0.7)] animate-pulse"
                      : "bg-white/15",
                )}
              />
              {i < total - 1 && (
                <span
                  className={cn(
                    "h-px w-8 rounded-full transition-colors duration-500",
                    done ? "bg-amber-500/60" : "bg-white/10",
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
        {current} / {total} completed
      </span>
    </div>
  );
}
