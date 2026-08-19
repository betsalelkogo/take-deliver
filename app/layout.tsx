import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "איסוף חבילות - כרם רעים",
  description:
    "פרסמו חבילות שצריך לאסוף, וסמנו את עצמכם כאוספים כשאתם בדרך לשם.",
  manifest: "/manifest.webmanifest",
  applicationName: "איסוף חבילות",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "איסוף חבילות",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <PwaRegister />
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192.png"
                  alt="איסוף חבילות"
                  className="h-9 w-9 rounded-lg"
                  width={36}
                  height={36}
                />
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
        </div>
      </body>
    </html>
  );
}
