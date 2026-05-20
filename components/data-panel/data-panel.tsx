import { FIELDS } from "@/lib/fields";
import type { CollectedData } from "@/lib/types";

import { FieldCard } from "./field-card";
import { JsonOutput } from "./json-output";

/**
 * The right-hand assessment panel — one card per collected field, on a dark
 * navy background. Cards animate as fields fill in. When the assessment is
 * complete, the final JSON object is revealed below the cards.
 *
 * `billUnknown` flips the bill row's display to "Not sure" once the user
 * has explicitly said they don't know their annual bill.
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
    <aside className="max-h-[40vh] w-full shrink-0 overflow-y-auto bg-slate-950 p-5 text-slate-100 md:order-2 md:max-h-none md:w-80">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
