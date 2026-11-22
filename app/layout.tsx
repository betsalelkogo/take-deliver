import type { Metadata, Viewport } from "next";
import { Assistant, Rubik } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { APP_NAME } from "@/lib/brand";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-head",
  display: "swap",
});

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
  themeColor: "#2b1240",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${rubik.variable} overflow-x-hidden`}
    >
      <body className={`${assistant.className} overflow-x-hidden`}>
        <PwaRegister />
        <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex-1">{children}</div>
          <footer className="mt-8 border-t-[1.5px] border-line px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center text-xs leading-5 text-soft">
            © {new Date().getFullYear()} {APP_NAME} · כל הזכויות שמורות
          </footer>
        </div>
      </body>
    </html>
  );
}
