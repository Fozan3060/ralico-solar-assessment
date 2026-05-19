import { Sun, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  filledCount: number;
  muted: boolean;
  onToggleMute: () => void;
  voiceSupported: boolean;
};

/** Top bar: Ralico logo on the left, progress + voice toggle on the right. */
export function ChatHeader({
  filledCount,
  muted,
  onToggleMute,
  voiceSupported,
}: ChatHeaderProps) {
  const total = 5;
  const percent = (filledCount / total) * 100;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
          <Sun className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          Ralico
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-slate-500">
            {filledCount} / {total} fields
          </span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {voiceSupported && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute assistant voice" : "Mute assistant voice"}
          >
            {muted ? (
              <VolumeX className="h-5 w-5 text-slate-400" />
            ) : (
              <Volume2 className="h-5 w-5 text-amber-600" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
