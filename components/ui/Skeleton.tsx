import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-lg bg-white/[0.06] shimmer", className)}
      aria-hidden="true"
    />
  );
}
