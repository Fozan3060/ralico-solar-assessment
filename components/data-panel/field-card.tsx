"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FieldMeta } from "@/lib/fields";
import { cn } from "@/lib/utils";

type FieldValue = string | number | null;

/**
 * One row in the data panel. Renders an icon + label + value, and animates
 * with a subtle scale "pop" the moment its value transitions from `null` →
 * filled (the field-just-confirmed feedback).
 */
export function FieldCard({
  field,
  value,
}: {
  field: FieldMeta;
  value: FieldValue;
}) {
  const filled = value !== null && value !== undefined;

  // Track previous filled state so we can fire the animation exactly once
  // when null → value happens (and not on the initial mount).
  const wasFilled = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      setJustFilled(true);
      const timer = setTimeout(() => setJustFilled(false), 600);
      wasFilled.current = filled;
      return () => clearTimeout(timer);
    }
    wasFilled.current = filled;
  }, [filled]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500",
        filled
          ? "border-amber-500/25 bg-slate-900/80"
          : "border-slate-800/80 bg-slate-900/40",
        justFilled && "animate-fill-pop",
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
            filled
              ? "font-medium text-white"
              : "italic text-slate-600",
          )}
        >
          {filled ? field.format(value as string | number) : "Pending"}
        </div>
      </div>

      {filled && (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"
          aria-label="Collected"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
