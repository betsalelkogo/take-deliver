"use client";

import { useEffect, useState } from "react";

const EXIT_MS = 220;

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setPresent(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [present, onClose]);

  if (!present) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4 motion-safe:transition-opacity motion-safe:duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`max-h-[min(92dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-5 sm:pb-5 motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out ${
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-100 sm:translate-y-3 sm:scale-95 sm:opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-lg leading-none"
            onClick={onClose}
            aria-label="סגירה"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
