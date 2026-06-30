"use client";

import { useMemo, useState } from "react";
import { createPackage } from "@/lib/packages";
import {
  ADHOC_AREA,
  ALL_AREAS,
  createStore,
  isAdhocArea,
  type StoreItem,
} from "@/lib/locations";

const NEW_STORE = "__new__";

export default function PackageForm({
  stores,
  onDone,
}: {
  stores: StoreItem[];
  onDone: () => void;
}) {
  const [area, setArea] = useState<string>("");
  const [store, setStore] = useState<string>("");
  const [newStore, setNewStore] = useState<string>("");
  const [pinStore, setPinStore] = useState(true);
  const [description, setDescription] = useState("");
  const [packageNumber, setPackageNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adhoc = isAdhocArea(area);

  const areaStores = useMemo(
    () =>
      stores
        .filter((s) => s.area === area)
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [stores, area]
  );

  const handleAreaChange = (next: string) => {
    setArea(next);
    setStore("");
    setNewStore("");
    setError(null);
  };

  const resolvedStore = adhoc
    ? newStore
    : store === NEW_STORE
    ? newStore
    : store;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!area) {
      setError("בחרו אזור.");
      return;
    }
    if (!resolvedStore.trim()) {
      setError(adhoc ? "הזינו את שם המקום." : "בחרו חנות או הוסיפו חדשה.");
      return;
    }
    if (!ownerName.trim()) {
      setError("הזינו את השם שלכם.");
      return;
    }
    setSubmitting(true);
    try {
      const storeName = resolvedStore.trim();
      // Pin a newly typed store in a fixed area so it's reusable next time.
      const isNew = adhoc ? false : store === NEW_STORE;
      const alreadyExists = areaStores.some(
        (s) => s.name.trim().toLowerCase() === storeName.toLowerCase()
      );
      if (isNew && pinStore && !alreadyExists) {
        await createStore(area, storeName);
      }
      await createPackage({
        area,
        store: storeName,
        description,
        packageNumber,
        ownerName,
        ownerPhone,
        notes,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">
          אזור <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_AREAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => handleAreaChange(a)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                area === a
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {area && !adhoc && (
        <div>
          <label className="label">
            חנות <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {areaStores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStore(s.name)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  store === s.name
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                📌 {s.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStore(NEW_STORE)}
              className={`rounded-full border border-dashed px-3 py-1.5 text-sm font-medium transition ${
                store === NEW_STORE
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-400 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              + חנות חדשה / מזדמנת
            </button>
          </div>
          {areaStores.length === 0 && store !== NEW_STORE && (
            <p className="mt-1 text-xs text-slate-400">
              אין עדיין חנויות קבועות באזור הזה — הוסיפו אחת.
            </p>
          )}
        </div>
      )}

      {area && (adhoc || store === NEW_STORE) && (
        <div>
          <label className="label">
            {adhoc ? "שם המקום" : "שם החנות החדשה"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder={adhoc ? "לדוגמה: נקודת איסוף חד-פעמית" : "לדוגמה: עולם הממתקים"}
            value={newStore}
            onChange={(e) => setNewStore(e.target.value)}
          />
          {!adhoc && (
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={pinStore}
                onChange={(e) => setPinStore(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              נעיצה לרשימה הקבועה של {area}
            </label>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">מספר / קוד חבילה</label>
          <input
            className="input"
            placeholder="מספר מעקב או קוד לוקר"
            value={packageNumber}
            onChange={(e) => setPackageNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="label">מה זה?</label>
          <input
            className="input"
            placeholder="לדוגמה: קופסה קטנה, מעטפה"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            השם שלך <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder="מי צריך שיאספו עבורו"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">הטלפון שלך</label>
          <input
            className="input"
            placeholder="כדי שאוסף החבילה יוכל ליצור קשר"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">הערות</label>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder="כל דבר שיעזור: שעות פתיחה, מה לומר בדלפק וכו'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "מפרסם…" : "פרסום חבילה"}
        </button>
      </div>
    </form>
  );
}
