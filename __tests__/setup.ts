import "@testing-library/jest-dom/vitest";

// jsdom does not implement the Web Animations API. Components converted off
// GSAP use element.animate()/getAnimations(); give them inert stand-ins.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = function (): Animation {
    return {
      finished: Promise.resolve(),
      playState: "running",
      cancel() {},
      pause() {},
      play() {},
      reverse() {},
    } as unknown as Animation;
  } as typeof Element.prototype.animate;

  Element.prototype.getAnimations = function (): Animation[] {
    return [];
  };
}

// jsdom lacks matchMedia; motion helpers call it synchronously.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
}
