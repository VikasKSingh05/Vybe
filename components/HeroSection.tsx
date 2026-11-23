export function HeroSection() {
  return (
    <section className="shrink-0 pb-5">
      <div className="mb-2.5 flex items-center gap-3">
        <span className="signal-line h-px w-10 bg-signal/60" />
        <p className="mono-label text-paper/40">Global broadcast / 001</p>
      </div>

      <h1 className="font-display text-[clamp(2.5rem,7vw,5.25rem)] leading-[0.78] font-extrabold tracking-[-0.07em] text-paper">
        VYBE<span className="text-signal">.</span>LIVE
      </h1>

      <div className="signal-line signal-line--slow mt-4 h-px w-full bg-gradient-to-r from-signal/60 via-signal/20 to-transparent" />
    </section>
  );
}
