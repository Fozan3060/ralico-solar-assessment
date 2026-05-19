import { Check } from "lucide-react";

import { FIELDS } from "@/lib/fields";
import type { CollectedData } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The right-hand assessment panel — one row per collected field.
 * (feature/data-panel refines the styling; feature/complete-state adds the
 * final JSON block.)
 */
export function DataPanel({ collected }: { collected: CollectedData }) {
  return (
    <aside className="w-full shrink-0 bg-slate-950 p-4 text-slate-100 md:order-2 md:w-80">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Assessment
      </h2>

      <div className="space-y-2">
        {FIELDS.map((field) => {
          const value = collected[field.key];
          const filled = value !== null && value !== undefined;

          return (
            <div
              key={field.key}
              className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2.5"
            >
              <span className="text-lg" aria-hidden>
                {field.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400">{field.label}</div>
                <div
                  className={cn(
                    "truncate text-sm",
                    filled ? "text-white" : "text-slate-600",
                  )}
                >
                  {filled ? field.format(value) : "Pending"}
                </div>
              </div>
              {filled && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
