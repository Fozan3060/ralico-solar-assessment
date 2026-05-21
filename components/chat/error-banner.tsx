"use client";

type ErrorBannerProps = {
  message: string;
  onDismiss: () => void;
};

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mx-6 mt-1 mb-1 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
      <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-red-300">
        error
      </span>
      <span className="flex-1 break-words">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-red-300/70 hover:text-red-200"
      >
        ×
      </button>
    </div>
  );
}
