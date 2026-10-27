"use client";

import { useEffect, useState } from "react";
import { useIdentity } from "@/lib/identity";

const KEY = "td_intro_dismissed_v2";

export default function WelcomeBanner() {
  const { identity, loaded } = useIdentity();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (localStorage.getItem(KEY)) {
        setVisible(false);
        return;
      }
    } catch {
      // storage unavailable — still show once
    }
    // Returning visitors who already saved identity don't need the intro.
    setVisible(!identity);
  }, [loaded, identity]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="relative rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white sm:p-6">
      <h2 className="pe-8 text-lg font-bold sm:text-xl">
        צריכים עזרה עם חבילה?
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-50">
        איסוף מחנות, או העברה ליעד אחר. פרסמו את הבקשה, ומי שבדרך לשם משתבץ.
        בלי עוד הודעות &quot;מישהו מגיע ל___?&quot;.
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
        >
          הבנתי
        </button>
      </div>
    </section>
  );
}
