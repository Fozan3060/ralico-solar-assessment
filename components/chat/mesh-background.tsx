/**
 * Quiet, "alive" backdrop for the call view — three large blurred gradient
 * blobs that drift behind the UI on slow, offset cycles.
 */
export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070d]"
    >
      <div className="absolute -left-40 top-[12%] h-[44rem] w-[44rem] animate-mesh-a rounded-full bg-amber-500/25 blur-[140px]" />
      <div className="absolute -right-40 bottom-[10%] h-[42rem] w-[42rem] animate-mesh-b rounded-full bg-sky-500/20 blur-[140px]" />
      <div
        className="absolute left-1/3 top-[55%] h-[32rem] w-[32rem] animate-mesh-c rounded-full bg-fuchsia-500/15 blur-[120px]"
        style={{ animationDelay: "-6s" }}
      />
      {/* Vignette / contrast layer so foreground text stays legible */}
      <div className="absolute inset-0 bg-slate-950/55" />
      {/* Subtle grain / noise feel via a faint gradient grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_50%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
