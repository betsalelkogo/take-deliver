"use client";

import { useEffect, useState } from "react";
import PackageBoard from "./PackageBoard";
import TransferBoard from "./TransferBoard";

type Board = "pickup" | "transfer";

const KEY = "td_board_v1";

export default function HomeBoards() {
  const [board, setBoard] = useState<Board>("pickup");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "pickup" || saved === "transfer") setBoard(saved);
    } catch {
      // ignore
    }
  }, []);

  const choose = (next: Board) => {
    setBoard(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex w-full rounded-xl border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => choose("pickup")}
          className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            board === "pickup"
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          איסוף מחנויות
        </button>
        <button
          type="button"
          onClick={() => choose("transfer")}
          className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            board === "transfer"
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          העברות
        </button>
      </div>
      {board === "pickup" ? <PackageBoard /> : <TransferBoard />}
    </div>
  );
}
