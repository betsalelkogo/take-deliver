"use client";

import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  claimPackage,
  purgeExpiredClaimed,
  subscribeToPackages,
  unclaimPackage,
  type PackageItem,
} from "@/lib/packages";
import {
  ALL_AREAS,
  subscribeToStores,
  type StoreItem,
} from "@/lib/locations";
import { useIdentity } from "@/lib/identity";
import {
  collectorId,
  rankCollectors,
  subscribeCollectors,
  subscribeToCollectedCount,
  type CollectorScore,
} from "@/lib/stats";
import { toIntlPhone } from "@/lib/whatsapp";
import Modal from "./Modal";
import PackageForm from "./PackageForm";
import ManageStores from "./ManageStores";
import IdentityForm from "./IdentityForm";
import PackageRow from "./PackageRow";

type View = "available" | "claimed" | "mine";

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
  total: number;
}

function PodiumPlace({
  place,
  collector,
}: {
  place: 1 | 2 | 3;
  collector: CollectorScore;
}) {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const card =
    place === 1
      ? "border-amber-300 from-amber-50 to-amber-200 pb-3 pt-2 sm:pb-4 sm:pt-3"
      : place === 2
        ? "border-slate-300 from-slate-50 to-slate-200 pb-2 pt-1.5 sm:pb-3 sm:pt-2"
        : "border-orange-300 from-orange-50 to-orange-200 pb-1.5 pt-1.5 sm:pb-2 sm:pt-2";
  const step =
    place === 1
      ? "h-7 bg-amber-400 sm:h-10"
      : place === 2
        ? "h-5 bg-slate-400 sm:h-7"
        : "h-4 bg-orange-400 sm:h-5";

  return (
    <div className="flex min-w-0 flex-1 basis-0 flex-col items-center">
      <div
        className={`flex w-full flex-col items-center rounded-t-xl border bg-gradient-to-b px-1 shadow-sm sm:px-2 ${card}`}
      >
        <span className={place === 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}>
          {medal}
        </span>
        <span
          dir="rtl"
          className="max-w-full truncate text-center text-xs font-bold text-slate-800 sm:text-sm"
          title={collector.name}
        >
          {collector.name || "אלמוני"}
        </span>
        <span dir="rtl" className="text-[11px] font-semibold text-slate-600 sm:text-xs">
          {collector.count.toLocaleString("he-IL")} חבילות
        </span>
      </div>
      <div className={`w-full rounded-b-md ${step}`} />
    </div>
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
  const [collectedCount, setCollectedCount] = useState(0);
  const [topCollectors, setTopCollectors] = useState<CollectorScore[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const { identity, setIdentity } = useIdentity();
  const configured = isFirebaseConfigured;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 3500);
  };

  const myPhone = identity?.phone ? toIntlPhone(identity.phone) : "";
  // A package is "mine" if I posted it (owner) or I'm collecting it (courier).
  const isMine = (it: PackageItem) => {
    if (!identity) return false;
    const byPhone =
      !!myPhone &&
      (toIntlPhone(it.ownerPhone) === myPhone ||
        (!!it.courierPhone && toIntlPhone(it.courierPhone) === myPhone));
    const byName =
      !!identity.name &&
      (it.ownerName === identity.name || it.courierName === identity.name);
    return byPhone || byName;
  };

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsubPkgs = subscribeToPackages(
      (data) => {
        setItems(data);
        setLoading(false);
        // Auto-remove packages taken more than 2 days ago.
        purgeExpiredClaimed(data).catch(() => {});
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
    const unsubStats = subscribeToCollectedCount((count) =>
      setCollectedCount(count)
    );
    const unsubTop = subscribeCollectors((list) => setTopCollectors(list));
    return () => {
      unsubPkgs();
      unsubStores();
      unsubStats();
      unsubTop();
    };
  }, [configured]);

  // Per-package take: claim it (the collector then taps the WhatsApp button
  // on the package to notify the owner from their own WhatsApp).
  const takePackage = async (item: PackageItem) => {
    if (!identity?.name) {
      setPendingTake(item);
      setShowIdentity(true);
      return;
    }
    try {
      const counted = await claimPackage(item.id, identity.name, identity.phone);
      showToast(
        counted
          ? "נלקח! אל תשכחו לשלוח הודעה לבעל/ת החבילה 👇"
          : "החבילה כבר נלקחה"
      );
    } catch {
      showToast("לא הצלחנו לרשום את הלקיחה, נסו שוב");
    }
  };

  // Releasing a claimed package ("התחרטתי") reverses the collect: it frees
  // the package again and rolls the total + collector score back by one.
  const releasePackage = async (item: PackageItem) => {
    try {
      const reverted = await unclaimPackage(item.id);
      showToast(
        reverted ? "החבילה שוחררה וחזרה לרשימה" : "החבילה כבר שוחררה"
      );
    } catch {
      showToast("לא הצלחנו לבטל את הלקיחה, נסו שוב");
    }
  };

  const handleIdentitySave = async (id: { name: string; phone: string }) => {
    setIdentity(id);
    setShowIdentity(false);
    if (pendingTake) {
      const pkg = pendingTake;
      setPendingTake(null);
      try {
        const counted = await claimPackage(pkg.id, id.name, id.phone);
        showToast(
          counted
            ? "נלקח! אל תשכחו לשלוח הודעה לבעל/ת החבילה 👇"
            : "החבילה כבר נלקחה"
        );
      } catch {
        showToast("לא הצלחנו לרשום את הלקיחה, נסו שוב");
      }
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

  const champions = useMemo(() => {
    const liveById = new Map<string, CollectorScore>();
    for (const it of items) {
      if (it.status !== "claimed") continue;
      const id = collectorId(it.courierName || "", it.courierPhone || "");
      if (!id) continue;
      const prev = liveById.get(id);
      liveById.set(id, {
        id,
        name: (it.courierName || prev?.name || "").trim(),
        count: (prev?.count ?? 0) + 1,
      });
    }
    return rankCollectors(topCollectors, Array.from(liveById.values()), 3);
  }, [items, topCollectors]);

  const counts = useMemo(() => {
    const base = items.filter(
      (it) => (!areaFilter || it.area === areaFilter) && matchesText(it)
    );
    return {
      available: base.filter((i) => i.status === "available").length,
      claimed: base.filter((i) => i.status === "claimed").length,
      mine: base.filter((i) => isMine(i)).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, areaFilter, term, identity]);

  const areaGroups = useMemo<AreaGroup[]>(() => {
    const filtered = items.filter(
      (it) =>
        (view === "mine" ? isMine(it) : it.status === view) &&
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
        const list = areaPkgs
          .filter((p) => (p.store || NO_STORE) === name)
          // Urgent packages float to the top within each store.
          .sort((a, b) => Number(b.urgent) - Number(a.urgent));
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
  }, [items, stores, view, areaFilter, term, identity]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-sm font-semibold text-emerald-800 sm:px-4">
         עד היום נאספו {Math.max(0, collectedCount).toLocaleString("he-IL")} חבילות! 🎉
      </div>

      {champions.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-2 py-3 sm:px-4 sm:py-4">
          <p className="mb-3 text-center text-sm font-bold text-amber-900">
            🏆 אלופי האיסוף
          </p>
          <div
            className="mx-auto flex w-full max-w-md items-end justify-center gap-1 sm:gap-3"
            dir="ltr"
          >
            {champions[1] && (
              <PodiumPlace place={2} collector={champions[1]} />
            )}
            {champions[0] && (
              <PodiumPlace place={1} collector={champions[0]} />
            )}
            {champions[2] && (
              <PodiumPlace place={3} collector={champions[2]} />
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full rounded-lg border border-slate-300 bg-white p-0.5 sm:inline-flex sm:w-auto">
            {(["available", "claimed", "mine"] as View[]).map((v) => {
              const label =
                v === "available"
                  ? "ממתין ללקיחה"
                  : v === "claimed"
                  ? "נלקח"
                  : "שלי";
              const shortLabel =
                v === "available" ? "ממתין" : v === "claimed" ? "נלקח" : "שלי";
              const count =
                v === "available"
                  ? counts.available
                  : v === "claimed"
                  ? counts.claimed
                  : counts.mine;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition sm:flex-none sm:px-3 sm:py-1.5 sm:text-sm ${
                    view === v
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="sm:hidden">
                    {shortLabel} ({count})
                  </span>
                  <span className="hidden sm:inline">
                    {label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {identity?.name ? (
              <button
                type="button"
                className="max-w-full truncate rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className="input w-full sm:w-auto"
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
              className="input w-full sm:w-64"
              placeholder="חיפוש לפי חנות, פריט, שם…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setShowManage(true)}
            >
              ניהול חנויות
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
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
          ) : areaGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                {view === "available"
                  ? "אין כרגע חבילות שממתינות ללקיחה."
                  : view === "claimed"
                  ? "אין כרגע חבילות שנלקחו."
                  : "אין חבילות שקשורות אליך (שפרסמת או שאתם אוספים)."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {areaGroups.map((area) => (
                <section
                  key={area.area}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-brand-50 px-3 py-3 sm:px-4">
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
                      <div key={store.name} className="px-3 py-3 sm:px-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-semibold">
                            {store.pinned ? "📌 " : "🏬 "}
                            {store.name}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {store.items.length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {store.items.map((it) => (
                            <PackageRow
                              key={it.id}
                              item={it}
                              onTake={takePackage}
                              onRelease={releasePackage}
                              canManage={isMine(it)}
                            />
                          ))}
                        </ul>
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
        <PackageForm
          stores={stores}
          onDone={() => {
            setShowAdd(false);
            showToast("החבילה פורסמה! 📦");
          }}
        />
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

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 sm:px-4 bottom-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-3 max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
