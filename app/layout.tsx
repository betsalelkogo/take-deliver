import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "איסוף חבילות - כרם רעים",
  description:
    "פרסמו חבילות שצריך לאסוף, וסמנו את עצמכם כאוספים כשאתם בדרך לשם.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
                  ח
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight">
                    איסוף חבילות - כרם רעים
                  </h1>
                  <p className="text-xs text-slate-500">
                    פרסמו חבילה · אם אתם בדרך לשם תשתבצו ואספו את החבילות
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
            נבנה עם Next.js ו-Firebase · פריסה ב-Vercel
          </footer>
        </div>
      </body>
    </html>
  );
}
