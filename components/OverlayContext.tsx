"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface OverlayContextValue {
  isAnyOverlayOpen: boolean;
  registerOverlay: (id: string) => () => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openOverlays, setOpenOverlays] = useState<Set<string>>(new Set());

  const registerOverlay = useCallback((id: string) => {
    setOpenOverlays((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return () => {
      setOpenOverlays((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };
  }, []);

  const value = useMemo(
    () => ({
      isAnyOverlayOpen: openOverlays.size > 0,
      registerOverlay,
    }),
    [openOverlays.size, registerOverlay],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayContext() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlayContext must be used within an OverlayProvider");
  }
  return context;
}

export function useOverlay(id: string) {
  const { registerOverlay } = useOverlayContext();
  const [isOpen, setIsOpen] = useState(false);

  // Register on mount, unregister on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const unregister = useMemo(() => registerOverlay(id), [id]);

  return { isOpen, setIsOpen, unregister };
}