/**
 * Skeleton rendered by Next during loading transitions — silhouettes the
 * StartScreen layout (dark theme).
 */
export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#05070d] px-6">
      <div className="h-16 w-16 animate-pulse rounded-full bg-amber-500/30 blur-sm" />
      <div className="h-8 w-72 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
      <div className="mt-2 h-12 w-48 animate-pulse rounded-full bg-amber-500/30" />
    </main>
  );
}
