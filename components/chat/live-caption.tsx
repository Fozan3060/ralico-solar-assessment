import { cn } from "@/lib/utils";

/**
 * The big "subtitle" beneath the voice orb. Shows the assistant's latest line
 * during a call so the conversation reads at a glance — Gemini Live / Siri
 * vibe — without forcing the user to read a chat log.
 */
export function LiveCaption({
  text,
  variant = "assistant",
}: {
  text: string;
  variant?: "assistant" | "muted";
}) {
  if (!text) return null;
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <p
        className={cn(
          "text-balance text-lg leading-relaxed transition-colors duration-300 md:text-xl",
          variant === "muted" ? "text-slate-500" : "text-slate-100",
        )}
      >
        {text}
      </p>
    </div>
  );
}
