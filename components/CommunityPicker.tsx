"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import {
  listCommunities,
  readSavedCommunityId,
  type CommunitySummary,
} from "@/lib/communities";
import AppShell from "./AppShell";
import CommunityForm from "./CommunityForm";
import Modal from "./Modal";

function ListSkeleton() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="h-[3.25rem] rounded-xl border border-slate-200 bg-white motion-safe:animate-pulse"
        />
      ))}
    </ul>
  );
}

export default function CommunityPicker() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [communities, setCommunities] = useState<CommunitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Go straight to the device's community unless the user asked to switch.
  useEffect(() => {
    const switching = new URLSearchParams(window.location.search).has("switch");
    const saved = readSavedCommunityId();
    if (saved && !switching) {
      router.replace(`/c/${saved}`);
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    listCommunities()
      .then((list) => {
        if (!cancelled) setCommunities(list);
      })
      .catch(() => {
        if (cancelled) return;
        setError("לא הצלחנו לטעון את רשימת היישובים, נסו לרענן.");
        setCommunities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (communities ?? []).filter(
        (c) => !term || c.name.toLowerCase().includes(term)
      ),
    [communities, term]
  );

  return (
    <AppShell title={APP_NAME}>
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white sm:p-6">
          <h2 className="text-lg font-bold sm:text-xl">מאיפה אתם?</h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-50">
            בחרו את היישוב, השכונה או הבניין שלכם כדי לראות את החבילות
            וההעברות שלו. לא מצאתם? פתחו לוח חדש בחינם, זה לוקח חצי דקה.
          </p>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            placeholder="חיפוש יישוב, שכונה או בניין…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => setShowCreate(true)}
          >
            + פתיחת לוח חדש
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!ready || communities === null ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              {term ? <>לא מצאנו את &quot;{search.trim()}&quot;.</> : "עוד אין לוחות."}
            </p>
            <button
              type="button"
              className="btn-primary mt-3"
              onClick={() => setShowCreate(true)}
            >
              {term ? <>פתיחת לוח ל&quot;{search.trim()}&quot;</> : "פתיחת הלוח הראשון"}
            </button>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visible.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="truncate">📍 {c.name}</span>
                  <span aria-hidden="true" className="text-slate-400">
                    ←
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showCreate}
        title="פתיחת לוח חדש"
        onClose={() => setShowCreate(false)}
      >
        <CommunityForm
          key={showCreate ? "open" : "closed"}
          initialName={search.trim()}
          existing={communities ?? []}
          onCreated={(id) => router.push(`/c/${id}`)}
        />
      </Modal>
    </AppShell>
  );
}
