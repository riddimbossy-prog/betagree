import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChartNoAxesColumn, Home, Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/fixtures", label: "Fixtures", icon: ChartNoAxesColumn },
  { to: "/tipsters", label: "Desks", icon: Shield },
  { to: "/accuracy", label: "Accuracy", icon: Bell },
] as const;

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0 no-underline">
            <p className="text-sm font-semibold">{greeting()}</p>
            <p className="text-xs text-muted-foreground">Betagree · live consensus</p>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <AuthSlot />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open ? (
          <nav className="space-y-1 px-4 pb-4 md:hidden" aria-label="Mobile">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm font-medium",
                    active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/playbook"
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground"
            >
              Playbook
            </Link>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92%,22rem)] items-center justify-between rounded-full bg-card px-2 py-2 shadow-lift md:hidden"
        aria-label="Tabs"
      >
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                "grid size-11 place-items-center rounded-full",
                active ? "bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>

      <footer className="mt-auto hidden border-t border-hairline md:block">
        <div className="mx-auto flex max-w-5xl justify-between gap-4 px-6 py-6 text-xs text-subtle">
          <p>Betagree ranks soccer picks where the desks overlap. Not a sportsbook.</p>
          <Link to="/playbook" className="hover:text-foreground">
            Playbook
          </Link>
        </div>
      </footer>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-10 animate-pulse rounded-full bg-secondary" aria-hidden />;
  }
  if (user) {
    return (
      <SignedIn>
        <UserButton />
      </SignedIn>
    );
  }
  return (
    <SignedOut>
      <Button asChild variant="secondary" size="icon" className="rounded-full">
        <Link to="/login" aria-label="Sign in">
          <Bell />
        </Link>
      </Button>
    </SignedOut>
  );
}
