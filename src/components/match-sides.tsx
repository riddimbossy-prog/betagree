import type { ReactNode } from "react";
import { Crest } from "@/components/crest";
import { cn } from "@/lib/utils";

export function backedTeam(selection: string | null | undefined, home: string, away: string) {
  const s = String(selection || "").toLowerCase();
  if (s === "home" || s.startsWith("home")) return home;
  if (s === "away" || s.startsWith("away")) return away;
  return undefined;
}

function TeamSide({
  name,
  logo,
  align,
  picked,
}: {
  name: string;
  logo?: string | null;
  align: "start" | "end";
  picked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 fold:gap-2",
        align === "end" && "flex-row-reverse",
      )}
    >
      <Crest name={name} logo={logo} size="row" className="shrink-0" />
      <p
        title={name}
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight fold:text-sm",
          align === "end" ? "text-right" : "text-left",
          picked && "text-or",
        )}
      >
        {name}
      </p>
    </div>
  );
}

export function MatchSides({
  home,
  away,
  homeLogo,
  awayLogo,
  center,
  pick,
  className,
}: {
  home: string;
  away: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  center?: ReactNode;
  pick?: string | null;
  className?: string;
}) {
  const same = Boolean(homeLogo && homeLogo === awayLogo);
  const picked = pick?.trim().toLowerCase();
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 fold:gap-3",
        className,
      )}
    >
      <TeamSide
        name={home}
        logo={same ? null : homeLogo}
        align="start"
        picked={Boolean(picked && home.toLowerCase() === picked)}
      />
      <div className="flex min-w-0 max-w-[3.75rem] flex-col items-center justify-center px-0.5 fold:max-w-[5.5rem]">
        {center ?? <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">vs</span>}
      </div>
      <TeamSide
        name={away}
        logo={same ? null : awayLogo}
        align="end"
        picked={Boolean(picked && away.toLowerCase() === picked)}
      />
    </div>
  );
}
