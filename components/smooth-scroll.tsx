"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import type Lenis from "lenis";
import type { ScrollToOptions } from "lenis";

/** Ease-out exponential — the cinematic settle used by movy-style sites. */
const EASE_OUT_EXPO = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t));

const LENIS_OPTIONS = {
  // Lenis drives its own rAF loop, so no manual requestAnimationFrame needed.
  autoRaf: true,
  // Wheel scrolling uses frame-rate independent damping.
  lerp: 0.1,
  smoothWheel: true,
  // Native touch scrolling on mobile keeps momentum and the horizontal rails
  // feeling exactly like the rest of the OS.
  syncTouch: false,
  wheelMultiplier: 1,
  touchMultiplier: 1.4,
  // Vertical page scroll only — horizontal rails keep their native behaviour.
  gestureOrientation: "vertical" as const,
  // Lets nested scroll containers (poster rails, overlays) scroll natively when
  // they still have room, instead of being hijacked by the page.
  allowNestedScroll: true,
  // Users who ask for reduced motion get instant, unsmoothed scrolling.
  respectReducedMotion: true,
};

type SmoothScrollApi = {
  /** The live Lenis instance, or null before it mounts. */
  lenis: Lenis | null;
  /** Smooth scroll back to the top of the page. */
  scrollToTop: (options?: ScrollToOptions) => void;
  /** Smooth scroll to any position, element or anchor. */
  scrollTo: (target: number | string | Element, options?: ScrollToOptions) => void;
};

const SmoothScrollContext = createContext<SmoothScrollApi | null>(null);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <SmoothScrollBridge>{children}</SmoothScrollBridge>
    </ReactLenis>
  );
}

/**
 * Reads the root Lenis instance and republishes it as a small, typed API.
 * Kept separate so the provider stays a plain wrapper around ReactLenis.
 */
function SmoothScrollBridge({ children }: { children: ReactNode }) {
  const lenis = useLenis();

  const value = useMemo<SmoothScrollApi>(
    () => ({
      lenis: lenis ?? null,
      scrollToTop: (options) =>
        lenis?.scrollTo(0, {
          duration: 1.1,
          easing: EASE_OUT_EXPO,
          ...options,
        }),
      scrollTo: (target, options) => lenis?.scrollTo(target, options),
    }),
    [lenis],
  );

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

/**
 * Access the page's smooth scroll instance.
 * Falls back to a no-op API when used outside the provider.
 */
export function useSmoothScroll(): SmoothScrollApi {
  const ctx = useContext(SmoothScrollContext);

  return useMemo(
    () =>
      ctx ?? {
        lenis: null,
        scrollToTop: () => {},
        scrollTo: () => {},
      },
    [ctx],
  );
}
