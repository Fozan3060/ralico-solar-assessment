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
    <header className="relative z-10 flex items-center justify-between gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30">
          <Sun className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-100">
          Ralico
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
            {filledCount} / {total}
          </span>
          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/5 md:w-28">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
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
            className="text-slate-400 hover:bg-white/5 hover:text-slate-100"
          >
            {muted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5 text-amber-400" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
