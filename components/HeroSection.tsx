const SIGNAL_BARS = [7, 14, 22, 11, 18, 9];

export function HeroSection() {
  return (
    <section className="animate-hero-in flex items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <span className="signal-line h-px w-7 bg-signal/40" />
          <p className="mono-label text-paper/40">Global broadcast</p>
        </div>

        <h1 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.82] font-extrabold tracking-[-0.075em] text-paper">
          VYBE<span className="text-signal">.</span>LIVE
        </h1>
      </div>

      <div
        className="hidden shrink-0 items-end gap-1.5 pb-2 sm:flex"
        aria-hidden="true"
      >
        {SIGNAL_BARS.map((height, index) => (
          <span
            key={index}
            className="w-[3px] rounded-full bg-paper/20"
            style={{ height }}
          />
        ))}
        <span className="ml-2 h-1.5 w-1.5 rounded-full bg-signal motion-safe:animate-pulse" />
      </div>
    </section>
  );
}
