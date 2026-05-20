/**
 * Quiet, "alive" backdrop — three large radial gradient blobs (amber, cyan,
 * violet) sitting behind a fine dot grid for depth. Pure CSS, no animation
 * loops needed: the layered glows + dot grid give plenty of visual life.
 */
export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070d]"
    >
      {/* Three radial gradient blobs at fixed positions */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(255, 140, 66, 0.18), transparent 50%), radial-gradient(circle at 80% 70%, rgba(0, 217, 255, 0.12), transparent 50%), radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.1), transparent 60%)",
        }}
      />
      {/* Dot grid overlay for depth */}
      <div className="absolute inset-0 dot-grid opacity-60" />
      {/* Vignette so the foreground never washes out */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
