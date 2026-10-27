import { APP_TAGLINE } from "@/lib/brand";

export default function AppShell({
  title,
  subtitle = APP_TAGLINE,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
              width={36}
              height={36}
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
                {title}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {subtitle}
              </p>
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {actions}
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 pt-4 sm:px-4 sm:pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </>
  );
}
