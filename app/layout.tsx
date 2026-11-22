import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${APP_NAME} — חבילות והעברות בין שכנים`,
  description:
    "לוח חבילות לכל יישוב, שכונה או בניין: איסוף מחנויות והעברות בין שכנים.",
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
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
        <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex-1">{children}</div>
          <footer className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] leading-4 text-slate-400">
            © {new Date().getFullYear()} {APP_NAME} · כל הזכויות שמורות
          </footer>
        </div>
      </body>
    </html>
  );
}
