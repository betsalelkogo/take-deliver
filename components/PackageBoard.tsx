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
import {
  ALL_AREAS,
  isAdhocArea,
  subscribeToStores,
  type StoreItem,
} from "@/lib/locations";
import Modal from "./Modal";
import PackageForm from "./PackageForm";
import ClaimForm from "./ClaimForm";
import ManageStores from "./ManageStores";

type Filter = "open" | "all";

const NO_STORE = "ללא חנות";

interface StoreGroup {
  name: string;
  items: PackageItem[];
  availableIds: string[];
  pinned: boolean;
}

interface AreaGroup {
  area: string;
  stores: StoreGroup[];
  availableIds: string[];
  total: number;
}

interface ClaimTarget {
  label: string;
  packageIds: string[];
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
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [claimTarget, setClaimTarget] = useState<ClaimTarget | null>(null);

  const configured = isFirebaseConfigured;

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsubPkgs = subscribeToPackages(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    const unsubStores = subscribeToStores(
      (data) => setStores(data),
      (err) => setError(err.message)
    );
    return () => {
      unsubPkgs();
      unsubStores();
    };
  }, [configured]);

  const areaGroups = useMemo<AreaGroup[]>(() => {
    const term = search.trim().toLowerCase();
    const searching = term.length > 0;

    const matches = (it: PackageItem) =>
      it.area.toLowerCase().includes(term) ||
      it.store.toLowerCase().includes(term) ||
      it.description.toLowerCase().includes(term) ||
      it.ownerName.toLowerCase().includes(term);

    const filtered = items.filter((it) => {
      if (filter === "open" && it.status === "delivered") return false;
      if (searching && !matches(it)) return false;
      return true;
    });

    // Build the ordered list of areas: known areas first, then any extras.
    const extraAreas = Array.from(
      new Set(filtered.map((i) => i.area).filter((a) => a && !ALL_AREAS.includes(a)))
    );
    const orderedAreas = [...ALL_AREAS, ...extraAreas];

    const pinnedFor = (area: string) =>
      stores.filter((s) => s.area === area).map((s) => s.name);

    const groups: AreaGroup[] = [];

    for (const area of orderedAreas) {
      const areaPkgs = filtered.filter((p) => p.area === area);
      const adhoc = isAdhocArea(area);

      const storeNames = new Set<string>();
      for (const p of areaPkgs) storeNames.add(p.store || NO_STORE);
      // Pinned stores show even when empty (only for fixed areas, not while searching).
      if (!adhoc && !searching) {
        for (const name of pinnedFor(area)) storeNames.add(name);
      }

      if (storeNames.size === 0) continue;

      const pinnedNames = new Set(pinnedFor(area));

      const storeGroups: StoreGroup[] = Array.from(storeNames).map((name) => {
        const list = areaPkgs.filter((p) => (p.store || NO_STORE) === name);
        return {
          name,
          items: list,
          availableIds: list
            .filter((i) => i.status === "available")
            .map((i) => i.id),
          pinned: pinnedNames.has(name),
        };
      });

      storeGroups.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (b.availableIds.length !== a.availableIds.length)
          return b.availableIds.length - a.availableIds.length;
        return a.name.localeCompare(b.name, "he");
      });

      groups.push({
        area,
        stores: storeGroups,
        availableIds: areaPkgs
          .filter((i) => i.status === "available")
          .map((i) => i.id),
        total: areaPkgs.length,
      });
    }

    return groups;
  }, [items, stores, filter, search]);

  const hasAnything = areaGroups.some((g) => g.total > 0);
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
            placeholder="חיפוש לפי אזור, חנות, פריט, שם…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowManage(true)}
          >
            ניהול חנויות
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAdd(true)}
          >
            + פרסום חבילה
          </button>
        </div>
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
          ) : areaGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                {openCount === 0 && !search
                  ? "אין עדיין חבילות. היו הראשונים לפרסם!"
                  : "אין חבילות שתואמות את החיפוש."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {!hasAnything && (
                <p className="text-sm text-slate-500">
                  אין כרגע חבילות פתוחות. החנויות הקבועות מוצגות למטה.
                </p>
              )}
              {areaGroups.map((area) => (
                <section
                  key={area.area}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-brand-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-brand-900">
                        📍 {area.area}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {area.total} חבילות
                      </span>
                    </div>
                    {area.availableIds.length > 0 && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() =>
                          setClaimTarget({
                            label: area.area,
                            packageIds: area.availableIds,
                          })
                        }
                      >
                        אני מגיע לאזור — לקחת {area.availableIds.length}
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {area.stores.map((store) => (
                      <div key={store.name} className="px-4 py-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {store.pinned ? "📌 " : "🏬 "}
                              {store.name}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {store.items.length}
                            </span>
                          </div>
                        </div>

                        {store.items.length === 0 ? (
                          <p className="text-xs text-slate-400">אין חבילות</p>
                        ) : (
                          <ul className="space-y-2">
                            {store.items.map((it) => (
                              <li
                                key={it.id}
                                className={`rounded-lg px-3 py-2 ${
                                  it.status === "claimed"
                                    ? "border border-amber-300 bg-amber-50"
                                    : it.status === "delivered"
                                    ? "bg-slate-100 opacity-70"
                                    : "bg-slate-50"
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">
                                        {it.description || "חבילה"}
                                      </span>
                                      {it.packageNumber && (
                                        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600">
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
                                    {(it.status === "claimed" ||
                                      it.status === "delivered") &&
                                      (it.courierName || it.courierPhone) && (
                                        <p
                                          className={`mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${
                                            it.status === "delivered"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-amber-100 text-amber-800"
                                          }`}
                                        >
                                          {it.status === "delivered"
                                            ? "✅ נמסר ע״י "
                                            : "🚶 נלקח ע״י "}
                                          {it.courierName || "אוסף החבילה"}
                                          {it.courierPhone && (
                                            <>
                                              {" · "}
                                              <a
                                                className="font-medium hover:underline"
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
                                    {it.status === "available" && (
                                      <button
                                        type="button"
                                        className="btn-secondary px-3 py-1 text-xs"
                                        onClick={() =>
                                          setClaimTarget({
                                            label: `${store.name} — ${
                                              it.description || "חבילה"
                                            }`,
                                            packageIds: [it.id],
                                          })
                                        }
                                      >
                                        אני לוקח
                                      </button>
                                    )}
                                    {it.status === "claimed" && (
                                      <>
                                        <button
                                          type="button"
                                          className="btn-ghost px-2 py-1 text-xs"
                                          onClick={() => markDelivered(it.id)}
                                        >
                                          סמן כנמסרה
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-ghost px-2 py-1 text-xs"
                                          onClick={() => unclaimPackage(it.id)}
                                        >
                                          לא מגיע בסוף
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
                        )}
                      </div>
                    ))}
                  </div>
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
        <PackageForm stores={stores} onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal
        open={showManage}
        title="ניהול חנויות קבועות"
        onClose={() => setShowManage(false)}
      >
        <ManageStores stores={stores} />
      </Modal>

      <Modal
        open={claimTarget !== null}
        title="להיות אוסף החבילה"
        onClose={() => setClaimTarget(null)}
      >
        {claimTarget && (
          <ClaimForm
            label={claimTarget.label}
            packageIds={claimTarget.packageIds}
            onDone={() => setClaimTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
