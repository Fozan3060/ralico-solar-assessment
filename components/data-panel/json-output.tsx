"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { CollectedData } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Syntax-highlights the JSON-stringified `CollectedData`. Returns an HTML
 * string of tokens wrapped in coloured spans:
 *  - keys      → sky blue
 *  - strings   → emerald
 *  - numbers   → orange
 *  - booleans  → amber
 *  - null      → muted slate
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
 * The "snapshot" reveal — shown in the sidebar once the conversation is
 * complete. Faded-in pretty-printed JSON with a copy-to-clipboard pill.
 */
export function JsonOutput({ collected }: { collected: CollectedData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(collected, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently no-op.
    }
  };

  return (
    <div className="mt-6 animate-fade-in-up">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/[0.12] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Snapshot
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            copied
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
          )}
          aria-label={copied ? "Copied" : "Copy JSON"}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="overflow-x-auto rounded-xl border border-white/[0.06] bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-slate-300 shadow-[inset_0_0_30px_rgba(245,158,11,0.05)]"
        // Safe: the input is HTML-escaped above and spans are produced from
        // JSON.stringify output only — no user-controlled markup reaches the DOM.
        dangerouslySetInnerHTML={{ __html: highlightJson(collected) }}
      />
    </div>
  );
}
