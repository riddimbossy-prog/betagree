import type { ReactNode } from "react";
import { Crest } from "@/components/crest";
import { cn } from "@/lib/utils";

function TeamStack({
  name,
  logo,
}: {
  name: string;
  logo?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <Crest name={name} logo={logo} size="xs" className="shrink-0 tab:h-16 tab:w-[3.25rem]" />
      <p className="w-full max-w-[9.5rem] text-center text-[12px] font-semibold leading-tight break-words fold:text-sm">
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
  className,
}: {
  home: string;
  away: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  center: ReactNode;
  className?: string;
}) {
  const same = Boolean(homeLogo && homeLogo === awayLogo);
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 fold:gap-3", className)}>
      <TeamStack name={home} logo={same ? null : homeLogo} />
      <div className="flex min-w-0 max-w-[6.75rem] flex-col items-center justify-center self-center px-0.5 fold:max-w-[8rem]">
        {center}
      </div>
      <TeamStack name={away} logo={same ? null : awayLogo} />
    </div>
  );
}
