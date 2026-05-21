import type { OrbState } from "@/components/chat/voice-orb";
import { countFilledFields } from "@/lib/collected";
import { FIELD_KEYS } from "@/lib/fields";
import { FIELDS } from "@/lib/fields";
import type { CollectedData } from "@/lib/types";

import { FieldCard } from "./field-card";
import { JsonOutput } from "./json-output";

/**
 * Frosted-glass panel — "YOUR HOME SNAPSHOT" header with a count, one card
 * per field, and a slim amber progress bar at the bottom. The active card's
 * label and colour mirror the real global activity (`activityState`) so the
 * panel never claims "Listening…" when the mic isn't actually open.
 */
export function DataPanel({
  collected,
  isComplete,
  billUnknown,
  activityState = "idle",
}: {
  collected: CollectedData;
  isComplete: boolean;
  billUnknown: boolean;
  activityState?: OrbState;
}) {
  const filledCount =
    countFilledFields(collected) +
    (billUnknown && collected.annual_electricity_bill_gbp === null ? 1 : 0);
  const total = FIELD_KEYS.length;
  const percent = (filledCount / total) * 100;

  const activeIndex = FIELDS.findIndex((f) => {
    if (f.key === "annual_electricity_bill_gbp") {
      return !billUnknown && collected[f.key] === null;
    }
    return collected[f.key] === null;
  });

  return (
    <aside className="glass relative flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden md:order-2 md:max-h-none md:w-[360px]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
          Your home snapshot
        </span>
        <span className="font-mono text-[11px] tabular-nums text-white/55">
          <span className="text-amber-300">{filledCount}</span>
          <span className="text-white/30"> / {total}</span>
        </span>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {FIELDS.map((field, i) => (
          <FieldCard
            key={field.key}
            index={i}
            field={field}
            value={collected[field.key]}
            unknown={
              field.key === "annual_electricity_bill_gbp" ? billUnknown : false
            }
            active={i === activeIndex && !isComplete}
            activityState={
              i === activeIndex && !isComplete ? activityState : "idle"
            }
          />
        ))}

        {isComplete && <JsonOutput collected={collected} />}
      </div>

      <div className="border-t border-white/[0.06] px-5 py-3.5">
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 font-mono text-[10px] text-white/35">
          {percent.toFixed(0)}% complete
        </div>
      </div>
    </aside>
  );
}
