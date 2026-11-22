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
    <section className="relative rounded-card border-[1.5px] border-line bg-white p-4 shadow-hard-sm sm:p-6">
      <h2 className="pe-8 text-lg font-bold text-plum sm:text-xl">
        צריכים עזרה עם חבילה?
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-soft">
        איסוף מחנות, או העברה ליעד אחר. פרסמו את הבקשה, ומי שבדרך לשם משתבץ.
        בלי עוד הודעות &quot;מישהו מגיע ל___?&quot;.
      </p>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={dismiss} className="btn-secondary px-3 py-1.5 text-sm">
          הבנתי
        </button>
      </div>
    </section>
  );
}
