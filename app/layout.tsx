import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "איסוף חבילות - כרם רעים",
  description:
    "פרסמו חבילות שצריך לאסוף, וסמנו את עצמכם כאוספים כשאתם בדרך לשם.",
  manifest: "/manifest.webmanifest",
  applicationName: "איסוף חבילות כרם רעים",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "איסוף חבילות כרם רעים",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <PwaRegister />
        <div className="min-h-dvh pt-[env(safe-area-inset-top)]">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192.png"
                  alt="איסוף חבילות כרם רעים"
                  className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
                  width={36}
                  height={36}
                />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
                    איסוף חבילות - כרם רעים
                  </h1>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    פרסמו חבילה · אם אתם בדרך לשם תשתבצו ואספו את החבילות
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-3 pt-4 sm:px-4 sm:pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
