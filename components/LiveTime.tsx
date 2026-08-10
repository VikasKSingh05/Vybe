"use client";

import { useEffect, useState } from "react";

export function LiveTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span
      className="text-[11px] tracking-wider text-white/45 uppercase"
      suppressHydrationWarning
    >
      {time}
    </span>
  );
}
