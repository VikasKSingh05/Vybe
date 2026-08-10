import { cn } from "@/lib/cn";

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center px-6 pt-28 pb-6 text-center md:pt-32 md:pb-8",
        className,
      )}
    >
      <h1 className="font-display text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] text-white">
        VYBE
      </h1>
      <p className="mt-4 max-w-xs text-[clamp(0.85rem,2vw,1rem)] leading-relaxed font-light tracking-wide text-white/55 md:mt-5 md:max-w-none">
        Pick a vibe.
        <br className="sm:hidden" />
        <span className="sm:ml-1">Press play.</span>
      </p>
    </section>
  );
}
