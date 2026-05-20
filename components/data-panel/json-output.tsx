"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { CollectedData } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Syntax-highlights the JSON-stringified CollectedData:
 *   - keys     → cyan
 *   - strings  → amber
 *   - numbers  → violet
 *   - null     → muted slate
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
      if (key) return `<span class="text-cyan-400">${key}</span>:`;
      if (str) return `<span class="text-amber-300">${str}</span>`;
      if (bool) return `<span class="text-violet-400">${bool}</span>`;
      if (nullLit) return `<span class="text-white/40">${nullLit}</span>`;
      if (num) return `<span class="text-violet-400">${num}</span>`;
      return match;
    },
  );
}

/**
 * The completion "snapshot" — a glassy card with an amber→violet gradient
 * border, a Copy button, and line-numbered syntax-highlighted JSON.
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

  const highlighted = highlightJson(collected);
  const lineCount = JSON.stringify(collected, null, 2).split("\n").length;

  return (
    <div className="glass-strong relative mt-6 animate-fade-in-up rounded-2xl p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
          Your assessment (JSON)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            copied
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white",
          )}
          aria-label={copied ? "Copied" : "Copy JSON"}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>

      {/* Code block with line numbers */}
      <div className="overflow-x-auto rounded-xl bg-black/40 p-3">
        <pre className="font-mono text-[11px] leading-relaxed">
          <code className="flex">
            {/* Line numbers */}
            <span
              aria-hidden
              className="mr-3 shrink-0 select-none text-right text-white/25"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </span>
            {/* Highlighted code */}
            <span
              className="flex-1 text-white/80"
              // Safe: input is HTML-escaped above; spans are produced only
              // from JSON.stringify output, no user-controlled markup.
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </code>
        </pre>
      </div>
    </div>
  );
}
