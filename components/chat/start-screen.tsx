"use client";

import { Mic, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type StartScreenProps = {
  /** `withVoice` true → spoken conversation; false → text-only. */
  onStart: (withVoice: boolean) => void;
  micSupported: boolean;
};

/**
 * The landing screen. Starting the assessment is also the user gesture that
 * unlocks browser audio, so the conversation always begins from a button.
 */
export function StartScreen({ onStart, micSupported }: StartScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-amber-50 px-6 text-center">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white">
          <Sun className="h-5 w-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight text-slate-900">
          Ralico
        </span>
      </div>

      <h1 className="max-w-md text-3xl font-semibold tracking-tight text-slate-900">
        Is solar right for your home?
      </h1>
      <p className="max-w-md text-slate-600">
        Have a quick voice chat with our advisor — five short questions to see
        whether solar would be a good fit for your home.
      </p>

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={() => onStart(true)}
          className="gap-2 bg-amber-500 text-base hover:bg-amber-600"
        >
          <Mic className="h-5 w-5" />
          Start voice chat
        </Button>
        <button
          type="button"
          onClick={() => onStart(false)}
          className="text-sm text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-800"
        >
          or type your answers instead
        </button>
      </div>

      {!micSupported && (
        <p className="max-w-xs text-xs text-slate-400">
          Voice input isn&apos;t available in this browser — the assistant will
          still speak, and you can reply by typing.
        </p>
      )}
    </main>
  );
}
