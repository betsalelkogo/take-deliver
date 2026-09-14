"use client";

import { useEffect, useRef, useState } from "react";

/** Animate small deltas (claim +1 / undo −1). Snap large jumps like first load. */
const ANIMATE_MAX_DELTA = 4;

export default function AnimatedCount({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    const to = value;
    if (from === to) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(to - from) > ANIMATE_MAX_DELTA) {
      setShown(to);
      return;
    }

    const duration = 420;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{Math.max(0, shown).toLocaleString("he-IL")}</>;
}
