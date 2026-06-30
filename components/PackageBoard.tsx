"use client";

import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  deletePackage,
  markDelivered,
  subscribeToPackages,
  unclaimPackage,
  type PackageItem,
} from "@/lib/packages";
import Modal from "./Modal";
import PackageForm from "./PackageForm";
import ClaimForm from "./ClaimForm";

type Filter = "open" | "all";

interface LocationGroup {
  location: string;
  items: PackageItem[];
  availableIds: string[];
}

function StatusBadge({ status }: { status: PackageItem["status"] }) {
  const map: Record<PackageItem["status"], string> = {
    available: "bg-emerald-100 text-emerald-700",
    claimed: "bg-amber-100 text-amber-700",
    delivered: "bg-slate-200 text-slate-600",
  };
  const label: Record<PackageItem["status"], string> = {
    available: "ממתינה לאיסוף",
    claimed: "שובץ אוסף החבילה",
    delivered: "נמסרה",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-base font-bold text-amber-900">
        Firebase עדיין לא מוגדר
      </h2>
      <p className="mt-2 text-sm text-amber-800">
        העתיקו את <code className="rounded bg-amber-100 px-1">.env.example</code>{" "}
        אל <code className="rounded bg-amber-100 px-1">.env.local</code>, מלאו את
        פרטי ה-Firebase של האפליקציה, והפעילו מחדש את שרת הפיתוח. לפרטים מלאים
        ראו את <code className="rounded bg-amber-100 px-1">README.md</code>.
      </p>
    </div>
  );
}

export default function PackageBoard() {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [claimTarget, setClaimTarget] = useState<LocationGroup | null>(null);

  const configured = isFirebaseConfigured;

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToPackages(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [configured]);

  const groups = useMemo<LocationGroup[]>(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((it) => {
      if (filter === "open" && it.status === "delivered") return false;
      if (!term) return true;
      return (
        it.pickupLocation.toLowerCase().includes(term) ||
        it.description.toLowerCase().includes(term) ||
        it.ownerName.toLowerCase().includes(term)
      );
    });

    const byLocation = new Map<string, PackageItem[]>();
    for (const it of filtered) {
      const key = it.pickupLocation || "Unspecified location";
      const arr = byLocation.get(key) ?? [];
      arr.push(it);
      byLocation.set(key, arr);
    }

    return Array.from(byLocation.entries())
      .map(([location, list]) => ({
        location,
        items: list,
        availableIds: list
          .filter((i) => i.status === "available")
          .map((i) => i.id),
      }))
      .sort((a, b) => b.availableIds.length - a.availableIds.length);
  }, [items, filter, search]);

  const openCount = items.filter((i) => i.status !== "delivered").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {(["open", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f === "open" ? "חבילות שלא נאספו" : "הכול"}
              </button>
            ))}
          </div>
          <input
            className="input sm:w-64"
            placeholder="חיפוש לפי מיקום, פריט, שם…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowAdd(true)}
        >
          + פרסום חבילה
        </button>
      </div>

      {!configured && <SetupNotice />}

      {configured && (
        <>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">טוען חבילות…</p>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                {openCount === 0
                  ? "אין עדיין חבילות. היו הראשונים לפרסם!"
                  : "אין חבילות שתואמות את החיפוש."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section
                  key={group.location}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">
                        📍 {group.location}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {group.items.length}
                      </span>
                    </div>
                    {group.availableIds.length > 0 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setClaimTarget(group)}
                      >
                        אני מגיע לכאן — לקחת {group.availableIds.length}
                      </button>
                    )}
                  </div>

                  <ul className="divide-y divide-slate-100">
                    {group.items.map((it) => (
                      <li key={it.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {it.description || "חבילה"}
                              </span>
                              {it.packageNumber && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                                  #{it.packageNumber}
                                </span>
                              )}
                              <StatusBadge status={it.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              עבור{" "}
                              <span className="font-medium text-slate-800">
                                {it.ownerName || "—"}
                              </span>
                              {it.ownerPhone && (
                                <>
                                  {" · "}
                                  <a
                                    className="text-brand-600 hover:underline"
                                    href={`tel:${it.ownerPhone}`}
                                  >
                                    {it.ownerPhone}
                                  </a>
                                </>
                              )}
                            </p>
                            {it.notes && (
                              <p className="mt-1 text-sm text-slate-500">
                                {it.notes}
                              </p>
                            )}
                            {it.status === "claimed" && it.courierName && (
                              <p className="mt-1 text-sm text-amber-700">
                                🚶 אוסף החבילה: {it.courierName}
                                {it.courierPhone && (
                                  <>
                                    {" · "}
                                    <a
                                      className="hover:underline"
                                      href={`tel:${it.courierPhone}`}
                                    >
                                      {it.courierPhone}
                                    </a>
                                  </>
                                )}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {it.status === "claimed" && (
                              <>
                                <button
                                  type="button"
                                  className="btn-ghost px-2 py-1 text-xs"
                                  onClick={() => markDelivered(it.id)}
                                >
                                  סמן שנאספה
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost px-2 py-1 text-xs"
                                  onClick={() => unclaimPackage(it.id)}
                                >
                                  לא אוסף בסוף
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="btn-ghost px-2 py-1 text-xs text-red-500 hover:text-red-700"
                              onClick={() => {
                                if (confirm("למחוק את החבילה?"))
                                  deletePackage(it.id);
                              }}
                            >
                              מחיקה
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={showAdd}
        title="פרסום חבילה לאיסוף"
        onClose={() => setShowAdd(false)}
      >
        <PackageForm onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal
        open={claimTarget !== null}
        title="להיות אוסף החבילה"
        onClose={() => setClaimTarget(null)}
      >
        {claimTarget && (
          <ClaimForm
            location={claimTarget.location}
            packageIds={claimTarget.availableIds}
            onDone={() => setClaimTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
