import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Flame, Home, Radio, Sparkles, Zap } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { PickProvider } from "@/components/pick-sheet";
import { PlayingTodayChip } from "@/components/playing-today";
import { preloadOfficialCrests } from "@/lib/official-crests";
import { TodayFilterProvider } from "@/lib/today-filter";

const NAV = [
  { to: "/", label: "Today", short: "Today", icon: Home },
  { to: "/live", label: "Live", short: "Live", icon: Radio },
  { to: "/banker", label: "Bankers", short: "Bankers", icon: Sparkles },
  { to: "/form", label: "Form", short: "Form", icon: Flame },
  { to: "/streaks", label: "Streaks", short: "Streaks", icon: Zap },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(() => preloadOfficialCrests(), { timeout: 2500 })
      : window.setTimeout(() => preloadOfficialCrests(), 1200);
    return () => {
      if (w.cancelIdleCallback && typeof id === "number") w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  const showTodayFilter = pathname !== "/login";

  return (
    <TodayFilterProvider>
    <PickProvider>
    <div className="relative z-10 flex min-h-dvh flex-col overflow-x-hidden text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="glass-strong header-glow sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:px-6 fold:gap-3 fold:py-2.5">
          <Link to="/" className="flex min-w-0 shrink items-center no-underline">
            <BrandLogo />
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : item.to === "/live"
                    ? pathname === "/live" || pathname.startsWith("/live/")
                    : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3 py-2 text-base font-medium no-underline",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {showTodayFilter ? <PlayingTodayChip /> : null}
            <AuthSlot />
          </div>
        </div>
      </header>

      <main id="main" className="page-pad mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-3 fold:px-6 fold:py-6">
        {children}
      </main>

      <nav className="tab-dock" aria-label="Tabs">
        {NAV.map((item) => {
          const active =
            item.to === "/"
              ? pathname === "/"
              : item.to === "/live"
                ? pathname === "/live" || pathname.startsWith("/live/")
                : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                "grid min-h-11 min-w-11 flex-1 place-items-center rounded-full px-1",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="tab-label mt-0.5 text-[9px] font-semibold tracking-wide uppercase fold:text-[10px]">
                {item.short}
              </span>
            </Link>
          );
        })}
      </nav>

      <footer className="glass mt-auto hidden lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 text-sm text-subtle">
          <p>Betagree. Not a sportsbook.</p>
          <div className="flex flex-wrap gap-4">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link to="/trends" className="hover:text-foreground">
              Trends
            </Link>
            <Link to="/fixtures" className="hover:text-foreground">
              Fixtures
            </Link>
            <Link to="/odds" className="hover:text-foreground">
              Filter
            </Link>
            <Link to="/accuracy" className="hover:text-foreground">
              Accuracy
            </Link>
            <Link to="/tipsters" className="hover:text-foreground">
              Sites
            </Link>
            <Link to="/playbook" className="hover:text-foreground">
              Playbook
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </PickProvider>
    </TodayFilterProvider>
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
