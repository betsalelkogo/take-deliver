import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { LEGAL_UPDATED } from "@/lib/legal";
import AppShell from "./AppShell";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-plum">{children}</div>
    </section>
  );
}

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell title={APP_NAME}>
      <article className="mx-auto max-w-3xl space-y-6 rounded-card border-[1.5px] border-line bg-white p-5 shadow-hard-sm sm:p-8">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-xs text-soft">עודכן לאחרונה: {LEGAL_UPDATED}</p>
        </header>
        {children}
        <p className="pt-2">
          <Link href="/" className="btn-secondary">
            חזרה ללוח
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
