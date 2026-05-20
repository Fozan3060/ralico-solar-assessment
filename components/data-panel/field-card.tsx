"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { OrbState } from "@/components/chat/voice-orb";
import type { FieldMeta } from "@/lib/fields";
import { cn } from "@/lib/utils";

type FieldValue = string | number | null;

/**
 * One row in the data panel. Has three visual states:
 *  - **filled**: amber border + value in white + amber check pill
 *  - **active**: border + label + dashed-circle indicator mirror the *real*
 *    app activity (listening → cyan, asking/thinking → amber, idle → muted)
 *    so the panel never claims "Listening…" when the mic isn't actually open
 *  - **pending**: muted card + hollow circle + "Not answered"
 */
export function FieldCard({
  field,
  value,
  unknown = false,
  active = false,
  activityState = "idle",
  index,
}: {
  field: FieldMeta;
  value: FieldValue;
  unknown?: boolean;
  active?: boolean;
  activityState?: OrbState;
  index: number;
}) {
  const filled = value !== null && value !== undefined;
  const confirmedUnknown = !filled && unknown;
  const confirmed = filled || confirmedUnknown;

  const wasConfirmed = useRef(confirmed);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (confirmed && !wasConfirmed.current) {
      setJustConfirmed(true);
      const timer = setTimeout(() => setJustConfirmed(false), 600);
      wasConfirmed.current = confirmed;
      return () => clearTimeout(timer);
    }
    wasConfirmed.current = confirmed;
  }, [confirmed]);

  // What the active card *says*, derived from the real global activity.
  const activeLabel =
    activityState === "listening"
      ? "Listening…"
      : activityState === "speaking"
        ? "Asking…"
        : activityState === "thinking"
          ? "Thinking…"
          : "Up next";

  const activeAccent =
    activityState === "listening"
      ? {
          border: "border-cyan-400/50",
          shadow: "shadow-[0_0_30px_-10px_rgba(0,217,255,0.5)]",
          text: "text-cyan-300",
          ring: "border-cyan-400",
        }
      : activityState === "speaking" || activityState === "thinking"
        ? {
            border: "border-amber-400/50",
            shadow: "shadow-[0_0_30px_-10px_rgba(255,140,66,0.45)]",
            text: "text-amber-300",
            ring: "border-amber-400",
          }
        : {
            border: "border-white/15",
            shadow: "",
            text: "text-white/55",
            ring: "border-white/25",
          };

  const indexLabel = String(index + 1).padStart(2, "0");

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-500",
        confirmed && "glass-strong border-amber-500/40",
        active && !confirmed && cn("glass-strong", activeAccent.border, activeAccent.shadow),
        !confirmed && !active && "glass border-white/10",
        justConfirmed && "animate-fill-pop",
      )}
    >
      {confirmed && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
          style={{
            boxShadow: "0 0 28px -10px rgba(255,140,66,0.5)",
          }}
        />
      )}

      <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-white/40">
        {indexLabel}
      </span>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm font-medium leading-tight",
            confirmed ? "text-white" : "text-white/75",
          )}
        >
          {field.label}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-xs leading-tight",
            filled && "text-amber-300/90",
            confirmedUnknown && "text-cyan-300/90",
            active &&
              !confirmed &&
              cn(activeAccent.text, activityState !== "idle" && "animate-pulse"),
            !confirmed && !active && "text-white/35",
          )}
        >
          {filled
            ? field.format(value as string | number)
            : confirmedUnknown
              ? "Not sure"
              : active
                ? activeLabel
                : "Not answered"}
        </div>
      </div>

      {confirmed ? (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-300"
          aria-label={confirmedUnknown ? "Marked unknown" : "Collected"}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : active ? (
        <span
          aria-hidden
          className={cn(
            "h-5 w-5 shrink-0 rounded-full border-2 border-dashed",
            activeAccent.ring,
            activityState !== "idle" && "animate-spin",
          )}
          style={{ animationDuration: "3.5s" }}
        />
      ) : (
        <span
          aria-hidden
          className="h-5 w-5 shrink-0 rounded-full border border-white/15"
        />
      )}
    </div>
  );
}
