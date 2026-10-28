"use client";

import { useEffect, useState } from "react";
import { OTHER_DESTINATION, isOtherDestination } from "@/lib/destinations";
import { createTransfer, type TransferKind } from "@/lib/transfers";
import { MAX_LENGTH } from "@/lib/limits";
import { isValidPhone } from "@/lib/whatsapp";
import type { Identity } from "@/lib/identity";
import { useCommunity } from "./CommunityContext";

export default function TransferForm({
  kind,
  destinations,
  identity,
  onIdentitySave,
  onDone,
}: {
  kind: TransferKind;
  destinations: string[];
  identity: Identity | null;
  onIdentitySave: (identity: Identity) => void;
  onDone: () => void;
}) {
  const { id: communityId } = useCommunity();
  const [destination, setDestination] = useState(
    destinations.length ? "" : OTHER_DESTINATION
  );
  const [customDestination, setCustomDestination] = useState("");
  const [description, setDescription] = useState("");
  const [whenText, setWhenText] = useState("");
  const [forWhom, setForWhom] = useState("");
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [ownerName, setOwnerName] = useState(identity?.name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(identity?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    setOwnerName((n) => n || identity.name);
    setOwnerPhone((p) => p || identity.phone);
  }, [identity]);

  const resolvedDestination = isOtherDestination(destination)
    ? customDestination
    : destination;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!resolvedDestination.trim()) {
      setError("בחרו יעד.");
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
      await createTransfer(communityId, {
        kind,
        destination: resolvedDestination,
        description,
        whenText,
        forWhom,
        notes,
        urgent,
        ownerName,
        ownerPhone,
      });
      onIdentitySave({ name: ownerName.trim(), phone: ownerPhone.trim() });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש.");
    } finally {
      setSubmitting(false);
    }
  };

  const isTrip = kind === "trip";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">
          יעד <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {[...destinations, OTHER_DESTINATION].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDestination(d)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                destination === d
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {isOtherDestination(destination) && (
        <div>
          <label className="label">
            שם היעד <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder="לדוגמה: שילה, בית חולים, בסיס"
            value={customDestination}
            maxLength={MAX_LENGTH.place}
            onChange={(e) => setCustomDestination(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="label">{isTrip ? "מתי יוצאים?" : "מתי צריך להגיע?"}</label>
        <input
          className="input"
          placeholder="לדוגמה: בימים הקרובים, יום חמישי בבוקר"
          value={whenText}
          maxLength={MAX_LENGTH.whenText}
          onChange={(e) => setWhenText(e.target.value)}
        />
      </div>

      <div>
        <label className="label">{isTrip ? "מה אפשר לקחת?" : "מה מעבירים?"}</label>
        <input
          className="input"
          placeholder={
            isTrip
              ? "לדוגמה: יש מקום לחבילה קטנה / גם טרמפ"
              : "לדוגמה: חבילה קטנה, מעטפה, ציוד"
          }
          value={description}
          maxLength={80}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {!isTrip && (
        <div>
          <label className="label">עבור מי?</label>
          <input
            className="input"
            placeholder="לדוגמה: לחייל בחומש, למשפחה"
            value={forWhom}
            maxLength={MAX_LENGTH.forWhom}
            onChange={(e) => setForWhom(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            השם שלך <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder={isTrip ? "מי נוסע" : "מי צריך להעביר"}
            value={ownerName}
            maxLength={MAX_LENGTH.name}
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
            placeholder="כדי שיוכלו לתאם איתך"
            value={ownerPhone}
            maxLength={MAX_LENGTH.phone}
            onChange={(e) => setOwnerPhone(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">הערות</label>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder={
            isTrip
              ? "שעה, נקודת יציאה, כמה מקום יש ברכב"
              : "גודל, נקודת מסירה ביישוב, כל דבר שיעזור"
          }
          value={notes}
          maxLength={MAX_LENGTH.notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {!isTrip && (
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          דחוף — צריך לצאת בהקדם
        </label>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "מפרסם…" : isTrip ? "פרסום נסיעה" : "פרסום בקשה"}
        </button>
      </div>
    </form>
  );
}
