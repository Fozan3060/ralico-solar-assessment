import { Sun, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  muted: boolean;
  onToggleMute: () => void;
  voiceSupported: boolean;
};

/**
 * Slim top bar: Ralico wordmark on the left, voice mute toggle on the right.
 * Progress lives elsewhere — ProgressDots above the orb during a conversation,
 * and the slim progress bar at the bottom of the data panel.
 */
export function ChatHeader({
  muted,
  onToggleMute,
  voiceSupported,
}: ChatHeaderProps) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white glow-amber">
          <Sun className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-lg font-bold tracking-[0.2em] text-white">
          RALICO{" "}
          <span className="text-amber-400">SOLAR</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {voiceSupported && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute assistant voice" : "Mute assistant voice"}
            className="text-white/50 hover:bg-white/[0.06] hover:text-white"
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
