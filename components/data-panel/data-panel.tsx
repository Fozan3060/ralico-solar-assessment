import { FIELDS } from "@/lib/fields";
import type { CollectedData } from "@/lib/types";

import { FieldCard } from "./field-card";
import { JsonOutput } from "./json-output";

/**
 * Frosted-glass panel — one card per collected field. Sits as a sidebar on
 * desktop and a collapsed strip at the top on mobile. The completed JSON
 * reveal appears below once the conversation is done.
 */
export function DataPanel({
  collected,
  isComplete,
  billUnknown,
}: {
  collected: CollectedData;
  isComplete: boolean;
  billUnknown: boolean;
}) {
  return (
    <aside className="relative max-h-[40vh] w-full shrink-0 overflow-y-auto border-b border-white/5 bg-white/[0.03] p-5 backdrop-blur-2xl md:order-2 md:max-h-none md:w-80 md:border-b-0 md:border-l">
      <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Your home
      </h2>

      <div className="space-y-2.5">
        {FIELDS.map((field) => (
          <FieldCard
            key={field.key}
            field={field}
            value={collected[field.key]}
            unknown={
              field.key === "annual_electricity_bill_gbp" ? billUnknown : false
            }
          />
        ))}
      </div>

      {isComplete && <JsonOutput collected={collected} />}
    </aside>
  );
}
