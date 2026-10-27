"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import {
  forgetCommunityId,
  getCommunity,
  saveCommunityId,
  type Community,
} from "@/lib/communities";
import AppShell from "./AppShell";
import BoardSkeleton from "./BoardSkeleton";
import { CommunityProvider } from "./CommunityContext";
import HomeBoards from "./HomeBoards";
import Toast from "./Toast";
import WelcomeBanner from "./WelcomeBanner";

const SWITCH_HREF = "/?switch=1";

export default function CommunityHome({ communityId }: { communityId: string }) {
  // undefined while loading, null when no such community exists.
  const [community, setCommunity] = useState<Community | null | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCommunity(communityId)
      .then((found) => {
        if (cancelled) return;
        setCommunity(found);
        if (found) saveCommunityId(found.id);
        else forgetCommunityId(communityId);
      })
      .catch(() => {
        if (!cancelled) setError("לא הצלחנו לטעון את הלוח, נסו לרענן.");
      });
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  useEffect(() => {
    if (community) document.title = `${community.name} — ${APP_NAME}`;
  }, [community]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 3500);
  };

  const invite = async () => {
    if (!community) return;
    const url = `${window.location.origin}/c/${community.id}`;
    const text = `הצטרפו ללוח החבילות של ${community.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: community.name, text, url });
      } catch {
        // user cancelled the share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("הקישור הועתק — שלחו אותו לשכנים 🔗");
    } catch {
      showToast(url);
    }
  };

  if (error || community === null) {
    return (
      <AppShell title={APP_NAME}>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            {error ?? "הלוח הזה לא נמצא. אולי הקישור שגוי?"}
          </p>
          <Link href={SWITCH_HREF} className="btn-primary mt-3">
            לבחירת יישוב
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!community) {
    return (
      <AppShell title={APP_NAME}>
        <BoardSkeleton />
      </AppShell>
    );
  }

  return (
    <CommunityProvider value={community}>
      <AppShell
        title={community.name}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary px-2.5 py-1 text-xs sm:text-sm"
              onClick={invite}
            >
              🔗 הזמנת שכנים
            </button>
            <Link
              href={SWITCH_HREF}
              className="btn-ghost px-2.5 py-1 text-xs sm:text-sm"
            >
              החלפה
            </Link>
          </>
        }
      >
        <div className="space-y-4 sm:space-y-6">
          <WelcomeBanner />
          <HomeBoards />
        </div>
      </AppShell>
      <Toast message={toast} />
    </CommunityProvider>
  );
}
