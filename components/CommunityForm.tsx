"use client";

import { useState } from "react";
import Link from "next/link";
import {
  COMMUNITY_NAME_MAX,
  COMMUNITY_NAME_MIN,
  createCommunity,
  normalizeCommunityName,
  sameCommunityName,
  type CommunitySummary,
} from "@/lib/communities";

export default function CommunityForm({
  initialName,
  existing,
  onCreated,
}: {
  initialName: string;
  existing: CommunitySummary[];
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = normalizeCommunityName(name);
  const duplicate = clean
    ? existing.find((c) => sameCommunityName(c.name, clean))
    : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (clean.length < COMMUNITY_NAME_MIN) {
      setError(`הזינו שם של לפחות ${COMMUNITY_NAME_MIN} תווים.`);
      return;
    }
    if (duplicate) return;
    setSubmitting(true);
    try {
      onCreated(await createCommunity(clean));
    } catch (err) {
      setError(err instanceof Error ? err.message : "לא הצלחנו לפתוח את הלוח, נסו שוב.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        כל אחד יכול לפתוח בחינם לוח לקהילה שלו, בין אם זה יישוב, שכונה או
        בניין. החבילות וההעברות שמתפרסמות בו מופיעות רק בו, ואחרי הפתיחה תקבלו
        קישור לשתף עם השכנים.
      </p>
      <div>
        <label className="label">
          שם היישוב / השכונה / הבניין <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          placeholder="לדוגמה: שכונת הפרחים, רחוב הגפן 12"
          value={name}
          maxLength={COMMUNITY_NAME_MAX}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {duplicate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          כבר יש לוח בשם הזה.{" "}
          <Link
            href={`/c/${duplicate.id}`}
            className="font-semibold text-brand-700 underline"
          >
            מעבר ל{duplicate.name}
          </Link>
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !!duplicate}
        >
          {submitting ? "פותח…" : "פתיחת הלוח"}
        </button>
      </div>
    </form>
  );
}
