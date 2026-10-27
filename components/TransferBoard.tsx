"use client";

import { useEffect, useMemo, useState } from "react";
import { useIdentity } from "@/lib/identity";
import {
  matchTransfer,
  subscribeToTransfers,
  type TransferItem,
  type TransferKind,
} from "@/lib/transfers";
import { toIntlPhone } from "@/lib/whatsapp";
import { destinationsFor } from "@/lib/destinations";
import { useCommunity } from "./CommunityContext";
import Modal from "./Modal";
import TransferForm from "./TransferForm";
import TransferRow from "./TransferRow";
import IdentityForm from "./IdentityForm";
import Toast from "./Toast";
import BoardSkeleton from "./BoardSkeleton";

type View = "open" | "mine";

export default function TransferBoard() {
  const [items, setItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("open");
  const [search, setSearch] = useState("");
  const [composeKind, setComposeKind] = useState<TransferKind>("request");
  const [showCompose, setShowCompose] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [pendingRide, setPendingRide] = useState<TransferItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { identity, setIdentity } = useIdentity();
  const community = useCommunity();
  const communityId = community.id;

  const destinations = useMemo(
    () =>
      destinationsFor(
        community.destinations,
        items.map((it) => it.destination)
      ),
    [community.destinations, items]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 3500);
  };

  const myPhone = identity?.phone ? toIntlPhone(identity.phone) : "";
  const isMine = (it: TransferItem) => {
    if (!identity) return false;
    const byPhone =
      !!myPhone &&
      (toIntlPhone(it.ownerPhone) === myPhone ||
        (!!it.riderPhone && toIntlPhone(it.riderPhone) === myPhone));
    const byName =
      !!identity.name &&
      (it.ownerName === identity.name || it.riderName === identity.name);
    return byPhone || byName;
  };

  useEffect(
    () =>
      subscribeToTransfers(
        communityId,
        (data) => {
          setItems(data);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      ),
    [communityId]
  );

  const takeRide = async (item: TransferItem) => {
    if (!identity?.name) {
      setPendingRide(item);
      setShowIdentity(true);
      return;
    }
    try {
      const ok = await matchTransfer(
        communityId,
        item.id,
        identity.name,
        identity.phone
      );
      showToast(
        ok
          ? "שובצת לנסיעה! שלחו הודעה למפרסם 👇"
          : "מישהו כבר לקח את ההעברה הזו"
      );
    } catch {
      showToast("לא הצלחנו לשבץ, נסו שוב");
    }
  };

  const handleIdentitySave = async (id: { name: string; phone: string }) => {
    setIdentity(id);
    setShowIdentity(false);
    if (pendingRide) {
      const item = pendingRide;
      setPendingRide(null);
      try {
        const ok = await matchTransfer(communityId, item.id, id.name, id.phone);
        showToast(
          ok
            ? "שובצת לנסיעה! שלחו הודעה למפרסם 👇"
            : "מישהו כבר לקח את ההעברה הזו"
        );
      } catch {
        showToast("לא הצלחנו לשבץ, נסו שוב");
      }
    }
  };

  const term = search.trim().toLowerCase();
  const matchesText = (it: TransferItem) =>
    !term ||
    it.destination.toLowerCase().includes(term) ||
    it.description.toLowerCase().includes(term) ||
    it.forWhom.toLowerCase().includes(term) ||
    it.ownerName.toLowerCase().includes(term) ||
    it.whenText.toLowerCase().includes(term);

  const counts = useMemo(() => {
    const base = items.filter(matchesText);
    return {
      open: base.filter((i) => i.status === "open").length,
      mine: base.filter((i) => isMine(i)).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, term, identity]);

  const groups = useMemo(() => {
    const filtered = items.filter(
      (it) =>
        (view === "mine" ? isMine(it) : it.status === "open") && matchesText(it)
    );
    const byDest = new Map<string, TransferItem[]>();
    for (const it of filtered) {
      const key = it.destination || "ללא יעד";
      const list = byDest.get(key) ?? [];
      list.push(it);
      byDest.set(key, list);
    }
    return Array.from(byDest.entries())
      .map(([destination, list]) => ({
        destination,
        items: list.sort((a, b) => Number(b.urgent) - Number(a.urgent)),
      }))
      .sort((a, b) => a.destination.localeCompare(b.destination, "he"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, view, term, identity]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900 sm:px-4">
        צריכים להעביר משהו ליעד אחר, כמו עיר סמוכה, בית חולים או נתב״ג? פרסמו
        בקשה. נוסעים לשם? פרסמו נסיעה, או השתבצו לבקשה שכבר ממתינה.
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full rounded-lg border border-slate-300 bg-white p-0.5 sm:inline-flex sm:w-auto">
            {(["open", "mine"] as View[]).map((v) => {
              const label = v === "open" ? "פתוח" : "שלי";
              const count = v === "open" ? counts.open : counts.mine;
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
                  {label} ({count})
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
          <input
            className="input w-full sm:w-64"
            placeholder="חיפוש לפי יעד, פריט, שם…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => {
                setComposeKind("trip");
                setShowCompose(true);
              }}
            >
              + אני נוסע
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={() => {
                setComposeKind("request");
                setShowCompose(true);
              }}
            >
              + צריך להעביר
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <BoardSkeleton />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            {view === "open"
              ? "אין כרגע בקשות או נסיעות פתוחות."
              : "אין מודעות שקשורות אליך."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section
              key={group.destination}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-sky-50 px-3 py-3 sm:px-4">
                <span className="text-base font-bold text-sky-900">
                  {group.destination}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {group.items.length}
                </span>
              </div>
              <ul className="space-y-2 px-3 py-3 sm:px-4">
                {group.items.map((it) => (
                  <TransferRow
                    key={it.id}
                    item={it}
                    onRide={takeRide}
                    canManage={isMine(it)}
                    myName={identity?.name || ""}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={showCompose}
        title={composeKind === "trip" ? "פרסום נסיעה" : "פרסום בקשת העברה"}
        onClose={() => setShowCompose(false)}
      >
        <TransferForm
          key={composeKind}
          kind={composeKind}
          destinations={destinations}
          identity={identity}
          onIdentitySave={setIdentity}
          onDone={() => {
            setShowCompose(false);
            showToast(
              composeKind === "trip" ? "הנסיעה פורסמה!" : "הבקשה פורסמה!"
            );
          }}
        />
      </Modal>

      <Modal
        open={showIdentity}
        title="מי אני?"
        onClose={() => {
          setShowIdentity(false);
          setPendingRide(null);
        }}
      >
        <IdentityForm initial={identity} onSave={handleIdentitySave} />
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
