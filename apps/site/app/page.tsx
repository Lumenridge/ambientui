/**
 * Stub. Phase 1 exists to prove the four hard things — package resolution
 * through dist, the Tailwind glob, stylesheet order, and that an export
 * build produces real HTML — not to port a page.
 *
 * The classes here are deliberately ones the check-css-surface sentinels
 * cover, so an unstyled build is visible rather than plausible.
 */
export default function Home() {
  return (
    <main className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="max-w-5xl text-4xl font-semibold tracking-tight">
        ambientui
      </h1>
      <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
        static export · phase 1
      </p>
    </main>
  )
}
