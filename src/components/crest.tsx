import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9",
  md: "size-14",
  lg: "size-16",
} as const;

export function Crest({
  logo,
  abbr,
  size = "md",
  className,
}: {
  logo?: string | null;
  abbr: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const letters = abbr.slice(0, 3).toUpperCase();

  return (
    <span className={cn("crest-plate", SIZES[size], className)} title={abbr}>
      {logo && !broken ? (
        <img src={logo} alt={`${abbr} crest`} onError={() => setBroken(true)} />
      ) : (
        <span className="text-xs font-bold tracking-tight text-crest-foreground">{letters}</span>
      )}
    </span>
  );
}
