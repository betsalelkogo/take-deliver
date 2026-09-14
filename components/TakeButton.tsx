"use client";

export const TAKE_TRUCK_MS = 2800;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function TakeButton({
  playing,
  busy,
  disabled,
  onClick,
}: {
  playing: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn take-btn min-h-10 w-full px-3 py-2 text-sm sm:min-h-10 sm:w-auto sm:min-w-[8.5rem] sm:px-4 sm:text-xs ${
        playing ? "take-btn-go" : ""
      }`}
      onClick={onClick}
      disabled={disabled || playing}
      aria-label="אני לוקח"
    >
      <span className="take-btn-label">
        {busy && !playing ? "לוקח…" : "אני לוקח"}
      </span>
      <span className="take-btn-stage" dir="ltr" aria-hidden="true">
        <span className="take-btn-box" />
        <span className="take-btn-truck">
          <span className="take-btn-door" />
          <span className="take-btn-bed" />
          <span className="take-btn-cab" />
          <span className="take-btn-wheel take-btn-wheel-l" />
          <span className="take-btn-wheel take-btn-wheel-r" />
        </span>
        <span className="take-btn-lines" />
      </span>
      <span className="take-btn-done">נלקח ✓</span>
    </button>
  );
}
