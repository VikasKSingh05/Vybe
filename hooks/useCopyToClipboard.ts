"use client";

import { useCallback, useRef, useState } from "react";

const RESET_MS = 1500;

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), RESET_MS);
    } catch {
      // clipboard unavailable
    }
  }, []);

  return { copied, copy };
}
