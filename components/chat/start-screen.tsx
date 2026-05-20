"use client";

import { Mic, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type StartScreenProps = {
  /** `withVoice` true → spoken conversation; false → text-only. */
  onStart: (withVoice: boolean) => void;
  micSupported: boolean;
};

/**
 * The landing screen. Starting the conversation is also the user gesture that
 * unlocks browser audio, so the conversation always begins from a button.
 */
export function StartScreen({ onStart, micSupported }: StartScreenProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center text-slate-100">
      {/* Glowing sun emblem */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-glow-pulse rounded-full bg-amber-500/40 blur-2xl" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 text-slate-950 shadow-[0_0_60px_-5px_rgba(245,158,11,0.7)]">
          <Sun className="h-7 w-7" strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex max-w-xl flex-col items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300 backdrop-blur-md">
          Ralico Solar
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Is solar right for your home?
        </h1>
        <p className="text-balance text-base text-slate-400 md:text-lg">
          Have a quick voice chat with our advisor — five short questions to see
          whether solar would be a good fit.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 pt-2">
        <Button
          size="lg"
          onClick={() => onStart(true)}
          className="group h-14 gap-2.5 rounded-full bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.5)] transition-all hover:bg-amber-400 hover:shadow-[0_0_45px_-5px_rgba(245,158,11,0.7)]"
        >
          <Mic className="h-5 w-5" />
          Start voice chat
        </Button>
        <button
          type="button"
          onClick={() => onStart(false)}
          className="text-sm text-slate-500 underline-offset-4 transition-colors hover:text-slate-300 hover:underline"
        >
          or type your answers instead
        </button>
      </div>

      {!micSupported && (
        <p className="max-w-xs text-xs text-slate-500">
          Voice input isn&apos;t available in this browser — the assistant will
          still speak, and you can reply by typing.
        </p>
      )}
    </main>
  );
}
