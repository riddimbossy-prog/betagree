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
    weekday: "short",
    day: "numeric",
    month: "short",
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
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 no-underline">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="font-display text-lg font-extrabold leading-none">B</span>
            </span>
            <span className="min-w-0">
              <span className="font-display block text-xl font-extrabold tracking-tight sm:text-2xl">
                Betagree
              </span>
              <span className="block text-xs tracking-widest text-subtle uppercase">
                Live consensus
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs tracking-wide text-subtle uppercase lg:inline">
              {dateLabel}
            </span>
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
            <div className="flex flex-col gap-1">
              {NAV.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-3 text-sm font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
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

      <footer className="mt-auto border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-xl leading-relaxed">
            Betagree reads today's live soccer slate and ranks the picks the desks actually
            agree on. Prices and scores refresh on their own. Not a sportsbook. 18+ / 21+ where it
            applies. ncpgambling.org
          </p>
          <p className="shrink-0 font-medium tracking-wide text-muted-foreground uppercase">
            © 2026 Betagree
          </p>
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
