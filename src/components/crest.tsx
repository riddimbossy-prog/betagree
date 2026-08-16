import { useState } from "react";
import { cn } from "@/lib/utils";

export function Crest({
  logo,
  abbr,
  size = "md",
  className,
}: {
  logo?: string | null;
  abbr: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const dim = size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-12";
  if (logo && !broken) {
    return (
      <img
        src={logo}
        alt=""
        className={cn(dim, "shrink-0 rounded-full bg-white object-contain p-1", className)}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "grid shrink-0 place-items-center rounded-full bg-white/90 text-xs font-bold text-background",
        className,
      )}
    >
      {abbr.slice(0, 3)}
    </span>
  );
}
