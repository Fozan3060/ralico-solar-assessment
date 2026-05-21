import type { OrbState } from "@/components/chat/voice-orb";

type StateHintProps = {
  state: OrbState;
};

/** Single line under the orb that mirrors the current state in plain words. */
export function StateHint({ state }: StateHintProps) {
  return (
    <p className="px-6 pb-1 text-center text-xs text-white/40">
      {state === "thinking" ? (
        "Thinking…"
      ) : state === "speaking" ? (
        "Wait until the orb turns blue…"
      ) : state === "listening" ? (
        <>
          <span className="mr-1.5 text-cyan-400">●</span>
          Speak now
        </>
      ) : (
        "Tap the mic to speak"
      )}
    </p>
  );
}
