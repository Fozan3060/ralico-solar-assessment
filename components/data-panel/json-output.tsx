import type { CollectedData } from "@/lib/types";

/**
 * Syntax-highlights the JSON-stringified `CollectedData`. Returns an HTML
 * string of tokens wrapped in coloured spans:
 *  - keys      → light blue
 *  - strings   → light green
 *  - numbers   → salmon / orange
 *  - true/false → amber
 *  - null      → muted grey
 *
 * The input is HTML-escaped before any wrapping, so the output is safe to
 * pass through `dangerouslySetInnerHTML`.
 */
function highlightJson(data: CollectedData): string {
  const json = JSON.stringify(data, null, 2);
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, str, bool, nullLit, num) => {
      if (key) return `<span class="text-sky-300">${key}</span>:`;
      if (str) return `<span class="text-emerald-300">${str}</span>`;
      if (bool) return `<span class="text-amber-300">${bool}</span>`;
      if (nullLit) return `<span class="text-slate-500">${nullLit}</span>`;
      if (num) return `<span class="text-orange-300">${num}</span>`;
      return match;
    },
  );
}

/**
 * The final structured-data reveal — shown in the sidebar once the assessment
 * is complete. Fades in + slides up on mount.
 */
export function JsonOutput({ collected }: { collected: CollectedData }) {
  return (
    <div className="mt-6 animate-fade-in-up">
      <span className="mb-2 inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        JSON
      </span>
      <pre
        className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-300"
        // Safe: input is HTML-escaped above; spans are produced from JSON.stringify output only.
        dangerouslySetInnerHTML={{ __html: highlightJson(collected) }}
      />
    </div>
  );
}
