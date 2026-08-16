import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Today" },
  { to: "/fixtures", label: "Fixtures" },
  { to: "/tipsters", label: "Desks" },
  { to: "/accuracy", label: "Accuracy" },
  { to: "/playbook", label: "Playbook" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 pt-3 text-[11px] tracking-[0.18em] text-subtle uppercase">
            <span>{dateLabel}</span>
            <span className="hidden sm:inline">Live edition</span>
          </div>
          <div className="paper-rule mt-2 flex items-center justify-between gap-4 py-3">
            <Link to="/" className="min-w-0 no-underline">
              <span className="font-display block text-3xl leading-none font-semibold tracking-tight sm:text-4xl">
                Betagree
              </span>
              <span className="mt-1 block text-[11px] tracking-[0.22em] text-primary uppercase">
                Soccer consensus
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <AuthSlot />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
          <nav className="hidden items-center gap-0 border-b border-ink/20 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative px-3 py-2.5 text-sm tracking-wide uppercase transition-colors duration-150",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        {open ? (
          <nav className="border-b border-ink/20 px-4 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col">
              {NAV.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "border-b border-hairline px-1 py-3 text-sm tracking-wide uppercase",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="mt-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="paper-rule flex flex-col gap-3 py-6 text-xs text-subtle sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-xl leading-relaxed">
              Betagree reads today's live soccer slate and ranks the picks the desks actually
              agree on. Prices and scores refresh on their own. Not a sportsbook. 18+ / 21+ where it
              applies. ncpgambling.org
            </p>
            <p className="shrink-0 tracking-wide uppercase">© 2026 Betagree · betagree.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-20 animate-pulse bg-secondary" aria-hidden />;
  }
  if (user) {
    return (
      <div className="hidden sm:block">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    );
  }
  return (
    <SignedOut>
      <Button asChild variant="outline" size="sm">
        <Link to="/login">Sign in</Link>
      </Button>
    </SignedOut>
  );
}
