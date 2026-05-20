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

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500",
        confirmed
          ? "border-amber-500/25 bg-amber-500/[0.08]"
          : "border-white/[0.06] bg-white/[0.02]",
        justConfirmed && "animate-fill-pop",
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        {field.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
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
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300"
          aria-label={confirmedUnknown ? "Marked unknown" : "Collected"}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
