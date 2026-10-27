"use client";

import { useEffect, useMemo, useState } from "react";
import { createPackage } from "@/lib/packages";
import {
  ADHOC_AREA,
  createStore,
  isAdhocArea,
  type StoreItem,
} from "@/lib/locations";
import { isValidPhone } from "@/lib/whatsapp";
import type { Identity } from "@/lib/identity";
import { useCommunity } from "./CommunityContext";

const NEW_STORE = "__new__";
const NEW_AREA = "__new_area__";

export default function PackageForm({
  stores,
  areas,
  onDone,
  identity,
  onIdentitySave,
}: {
  stores: StoreItem[];
  areas: string[];
  onDone: () => void;
  identity: Identity | null;
  onIdentitySave: (identity: Identity) => void;
}) {
  const { id: communityId } = useCommunity();
  const [area, setArea] = useState<string>("");
  const [newArea, setNewArea] = useState<string>("");
  const [store, setStore] = useState<string>("");
  const [newStore, setNewStore] = useState<string>("");
  const [pinStore, setPinStore] = useState(true);
  const [description, setDescription] = useState("");
  const [packageNumber, setPackageNumber] = useState("");
  const [ownerName, setOwnerName] = useState(identity?.name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(identity?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    setOwnerName((n) => n || identity.name);
    setOwnerPhone((p) => p || identity.phone);
  }, [identity]);

  const adhoc = isAdhocArea(area);
  const addingArea = area === NEW_AREA;
  const resolvedArea = addingArea ? newArea.trim().replace(/\s+/g, " ") : area;
  const typingStore = adhoc || addingArea || store === NEW_STORE;

  const areaStores = useMemo(
    () =>
      stores
        .filter((s) => s.area === resolvedArea)
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [stores, resolvedArea]
  );

  const handleAreaChange = (next: string) => {
    setArea(next);
    setNewArea("");
    setStore("");
    setNewStore("");
    setError(null);
  };

  const resolvedStore = typingStore ? newStore : store;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!area) {
      setError("בחרו אזור.");
      return;
    }
    if (addingArea && !resolvedArea) {
      setError("הזינו את שם האזור.");
      return;
    }
    if (!resolvedStore.trim()) {
      setError(
        adhoc
          ? "הזינו את שם המקום."
          : addingArea
          ? "הזינו את שם החנות."
          : "בחרו חנות או הוסיפו חדשה."
      );
      return;
    }
    if (!ownerName.trim()) {
      setError("הזינו את השם שלכם.");
      return;
    }
    if (!isValidPhone(ownerPhone)) {
      setError("הזינו מספר טלפון תקין.");
      return;
    }
    setSubmitting(true);
    try {
      const storeName = resolvedStore.trim();
      // Pin a newly typed store so it (and a new area) is reusable next time.
      const isNew = !adhoc && typingStore;
      const alreadyExists = areaStores.some(
        (s) => s.name.trim().toLowerCase() === storeName.toLowerCase()
      );
      if (isNew && pinStore && !alreadyExists) {
        await createStore(communityId, resolvedArea, storeName);
      }
      await createPackage(communityId, {
        area: resolvedArea,
        store: storeName,
        description,
        packageNumber,
        ownerName,
        ownerPhone,
        notes,
        urgent,
      });
      onIdentitySave({ name: ownerName.trim(), phone: ownerPhone.trim() });
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
          {[...areas, ADHOC_AREA].map((a) => (
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
          <button
            type="button"
            onClick={() => handleAreaChange(NEW_AREA)}
            className={`rounded-full border border-dashed px-3 py-1.5 text-sm font-medium transition ${
              addingArea
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-400 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            + אזור חדש
          </button>
        </div>
        {areas.length === 0 && !area && (
          <p className="mt-1 text-xs text-slate-400">
            עוד אין אזורים קבועים. הוסיפו אזור חדש (עיר, קניון, מרכז מסחרי) והוא
            יישמר לפעם הבאה.
          </p>
        )}
      </div>

      {addingArea && (
        <div>
          <label className="label">
            שם האזור <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder="לדוגמה: עיר סמוכה, קניון, מרכז מסחרי"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
          />
        </div>
      )}

      {area && !adhoc && !addingArea && (
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

      {area && typingStore && (
        <div>
          <label className="label">
            {adhoc ? "שם המקום" : addingArea ? "שם החנות" : "שם החנות החדשה"}{" "}
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
              נעיצה לרשימה הקבועה של {resolvedArea || "האזור"}
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
            maxLength={40}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">
            תיאור קצר (עד 40 תווים). פרטים ארוכים כדאי לרשום ב&quot;הערות&quot;.{" "}
            {description.length}/40
          </p>
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
          <label className="label">
            הטלפון שלך <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            placeholder="כדי שאוסף החבילה יוכל ליצור קשר"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
          />
        </div>
      </div>
      {identity?.name && identity?.phone && (
        <p className="-mt-2 text-xs text-slate-400">
          מולא אוטומטית מ«מי אני?» — אפשר לערוך אם צריך.
        </p>
      )}

      <div>
        <label className="label">הערות</label>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder="כל דבר שיעזור: שעות פתיחה, מה לומר בדלפק וכו'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(e) => setUrgent(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        🔴 חבילה דחופה (צריך לאסוף בהקדם)
      </label>

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
