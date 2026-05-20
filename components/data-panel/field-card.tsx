"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FieldMeta } from "@/lib/fields";
import { cn } from "@/lib/utils";

type FieldValue = string | number | null;

/**
 * One row in the data panel. Renders an icon + label + value, and animates
 * with a subtle scale "pop" the moment its value transitions from
 * unconfirmed → confirmed (either filled with a value, or explicitly
 * marked unknown by the user).
 */
export function FieldCard({
  field,
  value,
  unknown = false,
}: {
  field: FieldMeta;
  value: FieldValue;
  unknown?: boolean;
}) {
  const filled = value !== null && value !== undefined;
  const confirmedUnknown = !filled && unknown;
  // "Confirmed" = the user has given us an answer (a value OR an explicit
  // "I don't know"). This is what drives the check pill + the animation.
  const confirmed = filled || confirmedUnknown;

  // Track previous confirmed state so we can fire the animation exactly once
  // when unconfirmed → confirmed happens (and not on the initial mount).
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

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500",
        confirmed
          ? "border-amber-500/25 bg-slate-900/80"
          : "border-slate-800/80 bg-slate-900/40",
        justConfirmed && "animate-fill-pop",
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        {field.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {field.label}
        </div>
        <div
          className={cn(
            "truncate text-sm leading-tight",
            filled && "font-medium text-white",
            confirmedUnknown && "italic text-slate-400",
            !confirmed && "italic text-slate-600",
          )}
        >
          {filled
            ? field.format(value as string | number)
            : confirmedUnknown
              ? "Not sure"
              : "Pending"}
        </div>
      </div>

      {confirmed && (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"
          aria-label={confirmedUnknown ? "Marked unknown" : "Collected"}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
