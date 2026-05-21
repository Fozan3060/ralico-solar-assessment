"use client";

type SpeakHintProps = {
  onDismiss: () => void;
};

/**
 * One-time coaching overlay shown on the first turn. Teaches the orb's
 * colour convention before the user has tried to speak.
 */
export function SpeakHint({ onDismiss }: SpeakHintProps) {
  return (
    <div className="mx-6 mt-2 mb-1 flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/[0.08] px-4 py-3 shadow-[0_8px_32px_-12px_rgba(0,217,255,0.3)]">
      <span className="mt-1 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,217,255,0.7)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          Speak only when the orb turns blue
        </p>
        <p className="mt-0.5 text-xs text-white/55">
          Wait while it&apos;s amber — the assistant is speaking or thinking.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="shrink-0 rounded-full px-2 text-base text-white/40 hover:bg-white/[0.06] hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
