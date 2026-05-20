import { cn } from "@/lib/utils";

/**
 * A single chat message — assistant left with an "R" avatar, user right.
 * Currently unused on the main call view (replaced by the LiveCaption);
 * kept available for a future transcript drawer.
 */
export function MessageBubble({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex animate-fade-in-up gap-2.5",
        isUser && "flex-row-reverse",
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-sm font-semibold text-slate-950">
          R
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed backdrop-blur-md",
          isUser
            ? "rounded-br-sm border-amber-500/30 bg-amber-500/15 text-white"
            : "rounded-bl-sm border-white/10 bg-white/[0.06] text-slate-200",
        )}
      >
        {content}
      </div>
    </div>
  );
}
