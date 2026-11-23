export function HeroSection() {
  return (
    <section className="mb-7 shrink-0">
      <div className="mb-3 flex items-center gap-3">
        <span className="signal-line h-px w-10 bg-signal/60" />
        <p className="mono-label text-paper/40">Global broadcast / 001</p>
      </div>

      <h1 className="font-display text-[clamp(3rem,10vw,7rem)] leading-[0.76] font-extrabold tracking-[-0.07em] text-paper">
        VYBE<span className="text-signal">.</span>LIVE
      </h1>

      <div className="signal-line signal-line--slow mt-5 h-px w-full max-w-xl bg-gradient-to-r from-signal/60 via-signal/20 to-transparent" />
    </section>
  );
}
