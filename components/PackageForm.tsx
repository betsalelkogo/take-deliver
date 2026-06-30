"use client";

import { useState } from "react";
import { createPackage, type NewPackageInput } from "@/lib/packages";

const EMPTY: NewPackageInput = {
  description: "",
  pickupLocation: "",
  packageNumber: "",
  ownerName: "",
  ownerPhone: "",
  notes: "",
};

export default function PackageForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<NewPackageInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (key: keyof NewPackageInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.pickupLocation.trim() || !form.ownerName.trim()) {
      setError("חובה למלא מיקום איסוף ושם.");
      return;
    }
    setSubmitting(true);
    try {
      await createPackage(form);
      setForm(EMPTY);
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
          מיקום איסוף <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          placeholder="לדוגמה: סניף דואר מרכזי, לוקר 12, משרד תל אביב"
          value={form.pickupLocation}
          onChange={update("pickupLocation")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">מספר / קוד חבילה</label>
          <input
            className="input"
            placeholder="מספר מעקב או קוד לוקר"
            value={form.packageNumber}
            onChange={update("packageNumber")}
          />
        </div>
        <div>
          <label className="label">מה זה?</label>
          <input
            className="input"
            placeholder="לדוגמה: קופסה קטנה, מעטפה"
            value={form.description}
            onChange={update("description")}
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
            value={form.ownerName}
            onChange={update("ownerName")}
          />
        </div>
        <div>
          <label className="label">הטלפון שלך</label>
          <input
            className="input"
            placeholder="כדי שאוסף החבילה יוכל ליצור קשר"
            value={form.ownerPhone}
            onChange={update("ownerPhone")}
          />
        </div>
      </div>

      <div>
        <label className="label">הערות</label>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder="כל דבר שיעזור: שעות פתיחה, מה לומר בדלפק וכו'"
          value={form.notes}
          onChange={update("notes")}
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
