import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
      <head>
        <meta name="vibecheck-verification" content="vc-d46ad1389658c3aac09a6dd77b739dff" />
      </head>
      <body className={`${assistant.className} overflow-x-hidden`}>
        <a
          href="#main"
          className="absolute -top-full start-2 z-[100] rounded-b-[10px] bg-plum px-4 py-2 text-sm font-semibold text-white no-underline focus:top-0"
        >
          דלג לתוכן הראשי
        </a>
        <PwaRegister />
        <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex-1">{children}</div>
          <footer className="mt-8 border-t-[1.5px] border-line px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center text-xs leading-5 text-soft">
            <nav aria-label="מידע משפטי" className="mb-1">
              <Link href="/accessibility">הצהרת נגישות</Link>
              <span aria-hidden="true" className="mx-2">·</span>
              <Link href="/privacy">מדיניות פרטיות</Link>
              <span aria-hidden="true" className="mx-2">·</span>
              <Link href="/terms">תנאי שימוש</Link>
            </nav>
            © {new Date().getFullYear()} {APP_NAME} · כל הזכויות שמורות
          </footer>
        </div>
      </body>
    </html>
  );
}
