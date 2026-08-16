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
      <header className="sticky top-0 z-40 border-b border-hairline bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0 no-underline">
            <span className="font-display block text-xl font-semibold tracking-tight sm:text-2xl">
              Betagree
            </span>
            <span className="block text-xs text-subtle">{dateLabel}</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative py-2 text-sm font-medium transition-colors duration-150",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
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
        {open ? (
          <nav className="border-t border-hairline px-4 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col">
              {NAV.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "border-b border-hairline py-3 text-sm font-medium",
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

      <footer className="mt-auto border-t border-hairline bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-xl leading-relaxed">
            Betagree reads today's live soccer slate and ranks the picks the desks actually
            agree on. Prices and scores refresh on their own. Not a sportsbook. 18+ / 21+ where it
            applies. ncpgambling.org
          </p>
          <p className="shrink-0 text-muted-foreground">© 2026 Betagree</p>
        </div>
      </footer>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-secondary" aria-hidden />;
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
