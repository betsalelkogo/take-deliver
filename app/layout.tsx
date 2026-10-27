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
        <div className="min-h-dvh pt-[env(safe-area-inset-top)]">{children}</div>
      </body>
    </html>
  );
}
