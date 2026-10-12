"use client";

import { useState } from "react";
import {
  closeTransfer,
  deleteTransfer,
  unmatchTransfer,
  type TransferItem,
} from "@/lib/transfers";
import {
  joinTripMessage,
  rideOfferMessage,
  rideThanksMessage,
  whatsappLink,
} from "@/lib/whatsapp";
import { timeAgo } from "@/lib/time";

function WhatsappIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function haptic(ms = 15) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // unsupported or blocked
  }
}

export default function TransferRow({
  item,
  onRide,
  canManage,
  myName,
}: {
  item: TransferItem;
  onRide: (item: TransferItem) => void | Promise<void>;
  canManage: boolean;
  myName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const created = timeAgo(item.createdAt);
  const isTrip = item.kind === "trip";
  const isOpen = item.status === "open";
  const isMatched = item.status === "matched";

  const liClass = isMatched
    ? "border border-amber-300 bg-amber-50"
    : item.status === "closed"
      ? "border border-slate-200 bg-slate-100"
      : item.urgent
        ? "border border-red-300 bg-red-50"
        : "border border-transparent bg-slate-50";

  const handleRide = async () => {
    if (busy) return;
    setBusy(true);
    haptic(15);
    try {
      await onRide(item);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`overflow-hidden rounded-lg px-2 py-2 sm:px-3 ${liClass}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 font-medium leading-snug">
            {item.description || (isTrip ? "נסיעה" : "העברה")}
          </p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {item.urgent && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                דחוף
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isTrip
                  ? "bg-sky-100 text-sky-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isTrip ? "נוסע/ת" : "מחפש/ת העברה"}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {item.whenText && (
            <span className="font-medium text-slate-700">{item.whenText}</span>
          )}
          {item.forWhom && <span>עבור {item.forWhom}</span>}
          {item.ownerName && <span>של {item.ownerName}</span>}
          {created && <span className="text-slate-400">· {created}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isTrip && isOpen && (
            <button
              type="button"
              className="btn-primary min-h-10 flex-1 px-3 py-2 text-sm sm:flex-none sm:min-h-0 sm:px-3 sm:py-1 sm:text-xs"
              onClick={handleRide}
              disabled={busy}
            >
              {busy ? "משתבץ…" : "אני נוסע"}
            </button>
          )}
          {isTrip && isOpen && item.ownerPhone && (
            <a
              href={whatsappLink(
                item.ownerPhone,
                joinTripMessage(item, myName)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 sm:min-h-0 sm:flex-none sm:py-1"
            >
              <WhatsappIcon /> יש לי מה להעביר
            </a>
          )}
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "הסתר ▲" : "פרטים ▼"}
          </button>
        </div>
      </div>

      {isMatched && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {(item.riderName || item.riderPhone) && (
            <p className="inline-flex min-w-0 flex-wrap items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-800">
              נוסע/ת: {item.riderName || "שכן/ה"}
              {item.riderPhone && (
                <>
                  {" · "}
                  <a
                    className="font-medium hover:underline"
                    href={`tel:${item.riderPhone}`}
                  >
                    {item.riderPhone}
                  </a>
                </>
              )}
            </p>
          )}
          <button
            type="button"
            className="btn-secondary w-full px-3 py-2 text-sm sm:w-auto sm:py-1 sm:text-xs"
            onClick={() => {
              unmatchTransfer(item.id).catch(() => {});
            }}
          >
            התחרטתי
          </button>
        </div>
      )}

      {isMatched && (item.ownerPhone || item.riderPhone) && (
        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
          {item.ownerPhone && (
            <a
              href={whatsappLink(
                item.ownerPhone,
                rideOfferMessage(item, item.riderName || "שכן/ה")
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 sm:min-h-0 sm:py-1"
            >
              <WhatsappIcon /> הודעה למפרסם
            </a>
          )}
          {item.riderPhone && (
            <a
              href={whatsappLink(item.riderPhone, rideThanksMessage(item))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 sm:min-h-0 sm:py-1"
            >
              <WhatsappIcon /> הודעה לנוסע/ת
            </a>
          )}
        </div>
      )}

      {item.status === "closed" && (
        <p className="mt-2 text-xs font-medium text-slate-500">הנסיעה נסגרה</p>
      )}

      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-2 text-sm">
          {item.notes && <p className="text-slate-500">{item.notes}</p>}
          <p className="text-slate-600">
            {item.ownerName || "—"}
            {item.ownerPhone && (
              <>
                {" · "}
                <a
                  className="text-brand-600 hover:underline"
                  href={`tel:${item.ownerPhone}`}
                >
                  {item.ownerPhone}
                </a>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {canManage && isTrip && isOpen && (
              <button
                type="button"
                className="btn-secondary px-3 py-1 text-xs"
                onClick={() => closeTransfer(item.id)}
              >
                הנסיעה יצאה
              </button>
            )}
            {canManage && (
              <button
                type="button"
                className="btn-ghost px-3 py-1 text-xs text-red-500 hover:text-red-700"
                onClick={() => {
                  if (confirm("למחוק את המודעה?")) deleteTransfer(item.id);
                }}
              >
                מחיקה
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
