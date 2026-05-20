/**
 * Skeleton rendered by Next during loading transitions — silhouettes the
 * StartScreen layout so the swap into the real page isn't jarring.
 */
export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-amber-50 px-6">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 animate-pulse rounded-full bg-amber-200" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-11 w-56 animate-pulse rounded-md bg-amber-200/70" />
    </main>
  );
}
