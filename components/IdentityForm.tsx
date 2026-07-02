"use client";

import { useState } from "react";
import type { Identity } from "@/lib/identity";

export default function IdentityForm({
  initial,
  onSave,
}: {
  initial: Identity | null;
  onSave: (identity: Identity) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("הזינו שם.");
      return;
    }
    onSave({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        נשמור את הפרטים שלכם במכשיר הזה בלבד, כדי שבלחיצה על &quot;אני
        לוקח&quot; נדע מי אספ/ה — בלי למלא כל פעם מחדש.
      </p>
      <div>
        <label className="label">
          השם שלך <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          placeholder="לדוגמה: אלירן אביטל"
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
      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          שמירה
        </button>
      </div>
    </form>
  );
}
