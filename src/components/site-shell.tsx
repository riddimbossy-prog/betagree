import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChartNoAxesColumn, Flame, Home, Landmark, TrendingUp } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/crest";
import { PickProvider } from "@/components/pick-sheet";
import { preloadOfficialCrests } from "@/lib/official-crests";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/form", label: "Form", icon: Flame },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/fixtures", label: "Fixtures", icon: ChartNoAxesColumn },
  { to: "/banker", label: "Banker", icon: Landmark },
] as const;

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  preloadOfficialCrests();

  return (
    <PickProvider>
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 no-underline">
            <Crest name="Betagree" size="md" />
            <span className="min-w-0">
              <p className="text-sm font-semibold">{greeting()}</p>
              <p className="text-xs text-muted-foreground">Betagree · live consensus</p>
            </span>
          </Link>
          <AuthSlot />
        </div>
      </header>

      <main id="main" className="page-pad mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 fold:px-6">
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
                "grid size-11 place-items-center rounded-full",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>

      <footer className="mt-auto hidden border-t border-hairline xl:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6 text-xs text-subtle">
          <p>Betagree ranks soccer picks where the desks overlap. Not a sportsbook.</p>
          <div className="flex flex-wrap gap-4">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <Link to="/odds" className="hover:text-foreground">
              Filter
            </Link>
            <Link to="/accuracy" className="hover:text-foreground">
              Accuracy
            </Link>
            <Link to="/tipsters" className="hover:text-foreground">
              Desks
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
