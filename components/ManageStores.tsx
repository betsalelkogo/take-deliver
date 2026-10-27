"use client";

import { useMemo, useState } from "react";
import {
  createStore,
  deleteStore,
  isAdhocArea,
  type StoreItem,
} from "@/lib/locations";
import { useCommunity } from "./CommunityContext";

const NEW_AREA_KEY = "__new_area__";

export default function ManageStores({
  stores,
  areas,
}: {
  stores: StoreItem[];
  areas: string[];
}) {
  const { id: communityId } = useCommunity();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newArea, setNewArea] = useState("");
  const [newAreaStore, setNewAreaStore] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byArea = useMemo(() => {
    const map: Record<string, StoreItem[]> = {};
    for (const a of areas) map[a] = [];
    for (const s of stores) {
      if (map[s.area]) map[s.area].push(s);
    }
    for (const a of areas) {
      map[a].sort((x, y) => x.name.localeCompare(y.name, "he"));
    }
    return map;
  }, [stores, areas]);

  const add = async (area: string) => {
    const name = (drafts[area] ?? "").trim();
    if (!name) return;
    const exists = (byArea[area] ?? []).some(
      (s) => s.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setError(`"${name}" כבר קיימת ב${area}.`);
      return;
    }
    setError(null);
    setBusy(area);
    try {
      await createStore(communityId, area, name);
      setDrafts((d) => ({ ...d, [area]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setBusy(null);
    }
  };

  const addArea = async () => {
    const area = newArea.trim().replace(/\s+/g, " ");
    const name = newAreaStore.trim();
    if (!area || !name) {
      setError("הזינו שם אזור ושם של חנות ראשונה בו.");
      return;
    }
    if (areas.includes(area) || isAdhocArea(area)) {
      setError(`האזור "${area}" כבר קיים. הוסיפו אליו חנות ברשימה.`);
      return;
    }
    setError(null);
    setBusy(NEW_AREA_KEY);
    try {
      await createStore(communityId, area, name);
      setNewArea("");
      setNewAreaStore("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        הוסיפו חנויות קבועות לכל אזור. הן יופיעו תמיד כשמפרסמים חבילה וגם בלוח,
        כדי שכולם ישתמשו באותם שמות. אזור חדש נשמר כשיש בו לפחות חנות אחת.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="max-h-[55vh] space-y-4 overflow-y-auto pe-1">
        {areas.map((area) => (
          <div
            key={area}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-2 font-semibold">📍 {area}</div>
            <div className="mb-2 flex flex-wrap gap-2">
              {(byArea[area] ?? []).length === 0 && (
                <span className="text-xs text-slate-400">אין חנויות עדיין</span>
              )}
              {(byArea[area] ?? []).map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-sm"
                >
                  📌 {s.name}
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`מחיקת ${s.name}`}
                    onClick={() => deleteStore(communityId, s.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="שם חנות חדשה"
                value={drafts[area] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [area]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(area);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                disabled={busy === area}
                onClick={() => add(area)}
              >
                הוספה
              </button>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
          <div className="mb-2 font-semibold">+ אזור חדש</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input"
              placeholder="שם האזור (עיר, קניון…)"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
            />
            <input
              className="input"
              placeholder="חנות ראשונה באזור"
              value={newAreaStore}
              onChange={(e) => setNewAreaStore(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addArea();
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              disabled={busy === NEW_AREA_KEY}
              onClick={addArea}
            >
              הוספה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
