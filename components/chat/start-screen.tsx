"use client";

import { ArrowRight, Mic, Shield, Sun } from "lucide-react";

import { VoiceOrb } from "./voice-orb";

type StartScreenProps = {
  /** `withVoice` true → spoken conversation; false → text-only. */
  onStart: (withVoice: boolean) => void;
  micSupported: boolean;
};

/**
 * The landing screen. Big hero, glass CTA, privacy footer — laid out as a
 * single full-bleed column with the orb floating behind the headline.
 */
export function StartScreen({ onStart, micSupported }: StartScreenProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 text-center text-white">
      {/* Brand wordmark */}
      <div className="absolute left-6 top-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white glow-amber">
          <Sun className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-lg font-bold tracking-[0.2em] text-white">
          RALICO <span className="text-amber-400">SOLAR</span>
        </span>
      </div>

      {/* Hero */}
      <div className="animate-fade-in-up">
        <VoiceOrb state="idle" size={260} />
      </div>

      <div className="flex max-w-2xl flex-col items-center gap-5">
        <h1 className="text-balance text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          Is solar right for{" "}
          <span className="text-gradient-amber">your home?</span>
        </h1>
        <p className="max-w-lg text-balance text-base text-white/55 md:text-lg">
          A quick voice chat with our AI advisor — five short questions to see
          whether solar would be a good fit.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => onStart(true)}
          className="glass-strong group flex items-center gap-3 rounded-full px-8 py-4 text-base font-medium text-white transition-all hover:scale-[1.03] hover:glow-amber"
        >
          <Mic className="h-5 w-5 text-amber-400" />
          Start voice chat
          <ArrowRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          type="button"
          onClick={() => onStart(false)}
          className="text-sm text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
        >
          or type your answers instead
        </button>
      </div>

      {!micSupported && (
        <p className="max-w-xs text-xs text-white/40">
          Voice input isn&apos;t available in this browser — the assistant will
          still speak, and you can reply by typing.
        </p>
      )}

      {/* Privacy footer */}
      <div className="absolute bottom-6 flex flex-col items-center gap-1 text-center text-[11px] text-white/35">
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          <span className="font-mono tracking-wide">
            Private · Secure · No spam
          </span>
        </div>
        <span className="text-white/30">Your data stays with you.</span>
      </div>
    </main>
  );
}
