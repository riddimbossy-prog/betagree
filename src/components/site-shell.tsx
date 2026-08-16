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
      <header className="sticky top-0 z-40 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between pt-3 font-mono text-xs uppercase">
            <span>{dateLabel}</span>
            <span>Soccer daily</span>
          </div>
          <div className="masthead mt-2 flex items-end justify-between gap-4 py-3">
            <Link to="/" className="min-w-0 no-underline">
              <span className="font-display block text-5xl leading-none sm:text-6xl">Betagree</span>
            </Link>
            <div className="flex items-center gap-2 pb-1">
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
          <nav
            className="hidden items-stretch border-b-2 border-ink md:flex"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "font-display px-4 py-2.5 text-sm tracking-wider uppercase",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-card",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {open ? (
          <nav className="border-b-2 border-ink px-4 py-2 md:hidden" aria-label="Mobile">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "font-display block border-b border-ink/30 py-3 text-sm tracking-wider uppercase",
                    active && "text-loss",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="mt-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 border-t-4 border-ink py-5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            <p className="max-w-xl">
              Betagree is a soccer consensus daily. Not a sportsbook. 18+ / 21+ where it applies.
              ncpgambling.org
            </p>
            <p className="font-display tracking-wider uppercase">© 2026 Betagree</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-16 animate-pulse bg-secondary" aria-hidden />;
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
