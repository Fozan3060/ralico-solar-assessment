import { FIELDS } from "@/lib/fields";
import type { CollectedData } from "@/lib/types";

import { FieldCard } from "./field-card";

/**
 * The right-hand assessment panel — one card per collected field, on a dark
 * navy background. Cards animate as fields fill in. The final JSON reveal is
 * added in feature/complete-state.
 */
export function DataPanel({ collected }: { collected: CollectedData }) {
  return (
    <aside className="w-full shrink-0 bg-slate-950 p-5 text-slate-100 md:order-2 md:w-80 md:overflow-y-auto">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Assessment
      </h2>

      <div className="space-y-2.5">
        {FIELDS.map((field) => (
          <FieldCard
            key={field.key}
            field={field}
            value={collected[field.key]}
          />
        ))}
      </div>
    </aside>
  );
}
