"use client";

import { useEffect, useState } from "react";

const EXIT_MS = 220;

export default function Toast({ message }: { message: string | null }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setCurrent(message);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setCurrent(null), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!current) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 sm:px-4 bottom-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="status"
        className={`pointer-events-auto mx-3 max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg motion-safe:transition-all motion-safe:duration-200 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {current}
      </div>
    </div>
  );
}
