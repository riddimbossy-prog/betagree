import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Flame, Home, TrendingUp, Zap } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { PickProvider } from "@/components/pick-sheet";
import { PlayingTodayChip } from "@/components/playing-today";
import { preloadOfficialCrests } from "@/lib/official-crests";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/form", label: "Form", icon: Flame },
  { to: "/streaks", label: "Streaks", icon: Zap },
  { to: "/trends", label: "Trends", icon: TrendingUp },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  preloadOfficialCrests();
  const showTodayFilter = pathname !== "/login";

  return (
    <PickProvider>
    <div className="relative z-10 flex min-h-dvh flex-col overflow-x-hidden text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="glass-strong sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-6 fold:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo />
          </Link>
          <AuthSlot />
        </div>
        {showTodayFilter ? (
          <div className="mx-auto flex max-w-5xl items-center px-3 pb-3 sm:px-6">
            <PlayingTodayChip />
          </div>
        ) : null}
      </header>

      <main id="main" className="page-pad mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-5 fold:px-6 fold:py-6">
        {children}
      </main>

      <nav className="tab-dock" aria-label="Tabs">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
              <span className="hidden text-[10px] font-semibold tracking-wide uppercase tab:inline">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <footer className="glass mt-auto hidden xl:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6 text-xs text-subtle">
          <p>Betagree ranks soccer tips where 22 sites overlap. Not a sportsbook.</p>
          <div className="flex flex-wrap gap-4">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link to="/banker" className="hover:text-foreground">
              Banker
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
