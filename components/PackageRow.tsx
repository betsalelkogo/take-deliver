"use client";

import { useState } from "react";
import {
  deletePackage,
  setCourierNote,
  unclaimPackage,
  type PackageItem,
} from "@/lib/packages";
import { messageToCollector, takenMessage, whatsappLink } from "@/lib/whatsapp";

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

function StatusBadge({ status }: { status: PackageItem["status"] }) {
  const cls: Record<PackageItem["status"], string> = {
    available: "bg-emerald-100 text-emerald-700",
    claimed: "bg-amber-100 text-amber-700",
  };
  const label: Record<PackageItem["status"], string> = {
    available: "ממתין ללקיחה",
    claimed: "נלקח",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls[status]}`}
    >
      {label[status]}
    </span>
  );
}

export default function PackageRow({
  item,
  onTake,
}: {
  item: PackageItem;
  onTake: (item: PackageItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.courierNote);

  const liClass =
    item.status === "claimed"
      ? "border border-amber-300 bg-amber-50"
      : "bg-slate-50";

  const saveNote = async () => {
    await setCourierNote(item.id, noteDraft);
    setEditingNote(false);
  };

  return (
    <li className={`rounded-lg px-3 py-2 ${liClass}`}>
      {/* Compact header (always visible) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="max-w-[200px] truncate font-medium" title={item.description}>
            {item.description || "חבילה"}
          </span>
          {item.packageNumber && (
            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600">
              #{item.packageNumber}
            </span>
          )}
          <StatusBadge status={item.status} />
          {item.ownerName && (
            <span className="text-xs text-slate-500">
              עבור{" "}
              <span className="font-medium text-slate-700">
                {item.ownerName}
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.status === "available" && (
            <button
              type="button"
              className="btn-primary px-3 py-1 text-xs"
              onClick={() => onTake(item)}
            >
              אני לוקח
            </button>
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

      {/* Collector line (visible even when collapsed) */}
      {item.status === "claimed" && (item.courierName || item.courierPhone) && (
        <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-800">
          🚶 נלקח ע״י {item.courierName || "אוסף החבילה"}
          {item.courierPhone && (
            <>
              {" · "}
              <a
                className="font-medium hover:underline"
                href={`tel:${item.courierPhone}`}
              >
                {item.courierPhone}
              </a>
            </>
          )}
        </p>
      )}

      {/* WhatsApp buttons (tap to send from your own WhatsApp) */}
      {item.status === "claimed" && (item.ownerPhone || item.courierPhone) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {/* Collector → owner */}
          {item.ownerPhone && (
            <a
              href={whatsappLink(
                item.ownerPhone,
                takenMessage(item, item.courierName || "שכן/ה")
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              <WhatsappIcon /> הודעה לבעל החבילה
            </a>
          )}
          {/* Owner → collector */}
          {item.courierPhone && (
            <a
              href={whatsappLink(item.courierPhone, messageToCollector(item))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              <WhatsappIcon /> הודעה לאוסף החבילה
            </a>
          )}
        </div>
      )}

      {/* Expanded details */}
      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-2 text-sm">
          {item.description && (
            <p className="font-medium text-slate-800">📦 {item.description}</p>
          )}
          <p className="text-slate-600">
            עבור{" "}
            <span className="font-medium text-slate-800">
              {item.ownerName || "—"}
            </span>
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

          {item.notes && <p className="text-slate-500">📝 {item.notes}</p>}

          {/* Collector drop-off note */}
          {item.status === "claimed" && (
            <div>
              {editingNote ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="input min-h-[60px] resize-y"
                    placeholder="לדוגמה: אגיע בערב, אניח ברכב / אשים בבית שלי"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary px-3 py-1 text-xs"
                      onClick={saveNote}
                    >
                      שמירת הערה
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-xs"
                      onClick={() => {
                        setNoteDraft(item.courierNote);
                        setEditingNote(false);
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : item.courierNote ? (
                <p className="flex items-center gap-2 text-slate-700">
                  🗒️ {item.courierNote}
                  <button
                    type="button"
                    className="btn-ghost px-2 py-0.5 text-xs"
                    onClick={() => setEditingNote(true)}
                  >
                    עריכה
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  className="btn-secondary px-3 py-1 text-xs"
                  onClick={() => setEditingNote(true)}
                >
                  ➕ הוספת הערת איסוף (מתי/איפה אניח)
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {item.status === "claimed" && (
              <button
                type="button"
                className="btn-ghost px-3 py-1 text-xs"
                onClick={() => unclaimPackage(item.id)}
              >
                לא מגיע בסוף
              </button>
            )}
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs text-red-500 hover:text-red-700"
              onClick={() => {
                if (confirm("למחוק את החבילה?")) deletePackage(item.id);
              }}
            >
              מחיקה
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
