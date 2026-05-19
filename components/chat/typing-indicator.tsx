/** Three bouncing dots shown while the assistant's reply is being generated. */
export function TypingIndicator() {
  return (
    <div className="flex animate-fade-in-up gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
        R
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
