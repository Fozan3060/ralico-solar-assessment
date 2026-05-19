import { cn } from "@/lib/utils";

/** A single chat message — assistant left with an "R" avatar, user right. */
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
          R
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-slate-800 text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-800",
        )}
      >
        {content}
      </div>
    </div>
  );
}
