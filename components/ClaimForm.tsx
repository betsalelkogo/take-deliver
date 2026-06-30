"use client";

import { useState } from "react";
import { claimManyPackages } from "@/lib/packages";

interface ClaimFormProps {
  location: string;
  packageIds: string[];
  onDone: () => void;
}

export default function ClaimForm({
  location,
  packageIds,
  onDone,
}: ClaimFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("נא להזין שם.");
      return;
    }
    setSubmitting(true);
    try {
      await claimManyPackages(packageIds, name, phone);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        אתם מסמנים את עצמכם כאוסף החבילה בדרך אל{" "}
        <span className="font-semibold text-slate-900">{location}</span>. הפעולה
        תיקח{" "}
        <span className="font-semibold text-slate-900">
          {packageIds.length}
        </span>{" "}
        חבילות שמחכות שם.
      </p>
      <div>
        <label className="label">
          השם שלך <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          placeholder="אוסף החבילה (אתם)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label">הטלפון שלך</label>
        <input
          className="input"
          placeholder="כדי שהבעלים יוכלו לתאם איתך"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "אוסף…" : "אני מגיע — לקחת את אלה"}
        </button>
      </div>
    </form>
  );
}
