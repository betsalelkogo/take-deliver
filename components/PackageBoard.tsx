"use client";

import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  claimManyPackages,
  subscribeToPackages,
  type PackageItem,
} from "@/lib/packages";
import {
  ALL_AREAS,
  subscribeToStores,
  type StoreItem,
} from "@/lib/locations";
import { useIdentity } from "@/lib/identity";
import Modal from "./Modal";
import PackageForm from "./PackageForm";
import ManageStores from "./ManageStores";
import IdentityForm from "./IdentityForm";
import PackageRow from "./PackageRow";

type View = "available" | "claimed" | "delivered";

const NO_STORE = "ללא חנות";
const DAY = 24 * 60 * 60 * 1000;

interface StoreGroup {
  name: string;
  items: PackageItem[];
  availableIds: string[];
  pinned: boolean;
}

interface AreaGroup {
  area: string;
  stores: StoreGroup[];
  total: number;
}

interface TimeBucket {
  label: string;
  items: PackageItem[];
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
        פרטי ה-Firebase של האפליקציה, והפעילו מחדש את שרת הפיתוח.
      </p>
    </div>
  );
}

export default function PackageBoard() {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("available");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [pendingTake, setPendingTake] = useState<PackageItem | null>(null);

  const { identity, setIdentity } = useIdentity();
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

  // Per-package take: claim it (the collector then taps the WhatsApp button
  // on the package to notify the owner from their own WhatsApp).
  const takePackage = (item: PackageItem) => {
    if (!identity?.name) {
      setPendingTake(item);
      setShowIdentity(true);
      return;
    }
    claimManyPackages([item.id], identity.name, identity.phone);
  };

  const handleIdentitySave = (id: { name: string; phone: string }) => {
    setIdentity(id);
    setShowIdentity(false);
    if (pendingTake) {
      claimManyPackages([pendingTake.id], id.name, id.phone);
      setPendingTake(null);
    }
  };

  // Shared filtering: area dropdown + search text.
  const term = search.trim().toLowerCase();
  const matchesText = (it: PackageItem) =>
    !term ||
    it.area.toLowerCase().includes(term) ||
    it.store.toLowerCase().includes(term) ||
    it.description.toLowerCase().includes(term) ||
    it.ownerName.toLowerCase().includes(term);

  const areaGroups = useMemo<AreaGroup[]>(() => {
    if (view === "delivered") return [];

    const filtered = items.filter(
      (it) =>
        it.status === view &&
        (!areaFilter || it.area === areaFilter) &&
        matchesText(it)
    );

    const extraAreas = Array.from(
      new Set(filtered.map((i) => i.area).filter((a) => a && !ALL_AREAS.includes(a)))
    );
    const orderedAreas = [...ALL_AREAS, ...extraAreas].filter(
      (a) => !areaFilter || a === areaFilter
    );

    const pinnedFor = (area: string) =>
      stores.filter((s) => s.area === area).map((s) => s.name);

    const groups: AreaGroup[] = [];

    for (const area of orderedAreas) {
      const areaPkgs = filtered.filter((p) => p.area === area);

      const storeNames = new Set<string>();
      for (const p of areaPkgs) storeNames.add(p.store || NO_STORE);
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
        total: areaPkgs.length,
      });
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, stores, view, areaFilter, term]);

  const deliveredBuckets = useMemo<TimeBucket[]>(() => {
    if (view !== "delivered") return [];
    const now = Date.now();
    const delivered = items
      .filter(
        (it) =>
          it.status === "delivered" &&
          (!areaFilter || it.area === areaFilter) &&
          matchesText(it)
      )
      .sort(
        (a, b) =>
          (b.deliveredAt ?? b.createdAt ?? 0) -
          (a.deliveredAt ?? a.createdAt ?? 0)
      );

    const defs: { label: string; max: number }[] = [
      { label: "השבוע", max: 7 },
      { label: "לפני שבוע–שבועיים", max: 14 },
      { label: "שבועיים–שלושה שבועות", max: 21 },
      { label: "שלושה שבועות–חודש", max: 30 },
      { label: "מעל חודש", max: Infinity },
    ];
    const buckets: TimeBucket[] = defs.map((d) => ({ label: d.label, items: [] }));
    for (const it of delivered) {
      const t = it.deliveredAt ?? it.createdAt ?? now;
      const days = (now - t) / DAY;
      const idx = defs.findIndex((d) => days <= d.max);
      buckets[idx === -1 ? defs.length - 1 : idx].items.push(it);
    }
    return buckets.filter((b) => b.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, view, areaFilter, term]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {(["available", "claimed", "delivered"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === v
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "available"
                  ? "פתוח לאיסוף"
                  : v === "claimed"
                  ? "נאסף (בדרך)"
                  : "נמסרו"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {identity?.name ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setShowIdentity(true)}
              >
                אני: <span className="font-semibold">{identity.name}</span> ✎
              </button>
            ) : (
              <button
                type="button"
                className="rounded-full border border-dashed border-slate-400 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setShowIdentity(true)}
              >
                מי אני?
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-auto"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="">כל האזורים</option>
              {ALL_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              className="input sm:w-64"
              placeholder="חיפוש לפי חנות, פריט, שם…"
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
          ) : view !== "delivered" ? (
            areaGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  {view === "available"
                    ? "אין כרגע חבילות פתוחות לאיסוף."
                    : "אין כרגע חבילות שנאספו וממתינות למסירה."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
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
                    </div>

                    <div className="divide-y divide-slate-100">
                      {area.stores.map((store) => (
                        <div key={store.name} className="px-4 py-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-semibold">
                              {store.pinned ? "📌 " : "🏬 "}
                              {store.name}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {store.items.length}
                            </span>
                          </div>
                          {store.items.length === 0 ? (
                            <p className="text-xs text-slate-400">אין חבילות</p>
                          ) : (
                            <ul className="space-y-2">
                              {store.items.map((it) => (
                                <PackageRow
                                  key={it.id}
                                  item={it}
                                  onTake={takePackage}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : deliveredBuckets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">אין חבילות שנמסרו עדיין.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {deliveredBuckets.map((bucket) => (
                <section
                  key={bucket.label}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-base font-bold">🗓️ {bucket.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {bucket.items.length}
                    </span>
                  </div>
                  <ul className="space-y-2 p-4">
                    {bucket.items.map((it) => (
                      <PackageRow key={it.id} item={it} onTake={takePackage} />
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
        open={showIdentity}
        title="מי אני?"
        onClose={() => {
          setShowIdentity(false);
          setPendingTake(null);
        }}
      >
        <IdentityForm initial={identity} onSave={handleIdentitySave} />
      </Modal>
    </div>
  );
}
