import { useEffect, useId, useState } from "react";
import { type Charge, type Ordinary, blazon, CUTS, lettersOf } from "@/lib/heraldry";
import { useOfficialCrest } from "@/lib/official-crests";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-10 w-8",
  sm: "h-14 w-11",
  md: "h-[5.25rem] w-[4.25rem]",
  lg: "h-20 w-16 fold:h-28 fold:w-[5.6rem]",
} as const;

function OrdinaryMark({ kind, ink }: { kind: Ordinary; ink: string }) {
  switch (kind) {
    case "chief":
      return <path d="M0 0 H80 V28 H0 Z" fill={ink} />;
    case "pale":
      return <path d="M30 0 H50 V96 H30 Z" fill={ink} />;
    case "fess":
      return <path d="M0 38 H80 V58 H0 Z" fill={ink} />;
    case "bend":
      return <path d="M-8 10 L88 78 L78 92 L-18 24 Z" fill={ink} />;
    case "bend-sinister":
      return <path d="M88 10 L-8 78 L2 92 L98 24 Z" fill={ink} />;
    case "chevron":
      return <path d="M4 62 L40 34 L76 62 L76 76 L40 48 L4 76 Z" fill={ink} />;
    case "cross":
      return <path d="M33 0 H47 V96 H33 Z M0 40 H80 V56 H0 Z" fill={ink} />;
    case "saltire":
      return <path d="M8 8 L18 2 L72 70 L62 80 Z M72 8 L62 2 L8 70 L18 80 Z" fill={ink} />;
    case "per-pale":
      return <path d="M40 0 H80 V96 H40 Z" fill={ink} />;
    case "per-fess":
      return <path d="M0 0 H80 V48 H0 Z" fill={ink} />;
    case "quarterly":
      return (
        <>
          <path d="M0 0 H40 V48 H0 Z" fill={ink} />
          <path d="M40 48 H80 V96 H40 Z" fill={ink} />
        </>
      );
    case "gyronny":
      return (
        <>
          <path d="M40 48 L80 0 H40 Z" fill={ink} />
          <path d="M40 48 L80 96 H40 Z" fill={ink} />
          <path d="M40 48 L0 0 V48 Z" fill={ink} />
          <path d="M40 48 L0 96 V48 Z" fill={ink} />
        </>
      );
  }
}

function ChargeMark({ kind, fill }: { kind: Charge; fill: string }) {
  if (kind === "none") return null;
  if (kind === "mullet") {
    return (
      <path
        fill={fill}
        d="M40 30 L43.4 39.5 H53.5 L45.6 45.4 L48.9 55 L40 49.2 L31.1 55 L34.4 45.4 L26.5 39.5 H36.6 Z"
      />
    );
  }
  if (kind === "crescent") {
    return <path fill={fill} d="M46 36 A12 12 0 1 0 46 60 A8.5 8.5 0 1 1 46 36 Z" />;
  }
  if (kind === "bezant") {
    return <circle cx="40" cy="48" r="8.5" fill={fill} />;
  }
  if (kind === "annulet") {
    return <circle cx="40" cy="48" r="9" fill="none" stroke={fill} strokeWidth="3.4" />;
  }
  return <path fill={fill} d="M37 34 H43 V45 H54 V51 H43 V62 H37 V51 H26 V45 H37 Z" />;
}

function Lettering({
  ordinary,
  letters,
  field,
  ink,
}: {
  ordinary: Ordinary;
  letters: string;
  field: string;
  ink: string;
}) {
  const busy =
    ordinary === "cross" ||
    ordinary === "saltire" ||
    ordinary === "quarterly" ||
    ordinary === "gyronny" ||
    ordinary === "chevron";

  if (busy) {
    return (
      <g>
        <path
          d="M40 38 C46.5 38 51 41.2 51 46 V52.2 C51 58.4 46 62.4 40 64.6 C34 62.4 29 58.4 29 52.2 V46 C29 41.2 33.5 38 40 38 Z"
          fill={ink}
        />
        <text
          x="40"
          y="53.5"
          textAnchor="middle"
          fill={field}
          fontSize="9"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        >
          {letters}
        </text>
      </g>
    );
  }

  const y = ordinary === "chief" ? 21 : ordinary === "fess" ? 51 : 70;
  const fill = ordinary === "pale" || ordinary === "fess" || ordinary === "chief" ? field : ink;

  return (
    <text
      x="40"
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize="11"
      fontWeight="800"
      fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
      letterSpacing="-0.04em"
    >
      {letters}
    </text>
  );
}

export function Crest({
  name,
  logo,
  size = "md",
  className,
}: {
  name: string;
  logo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const official = useOfficialCrest(name);
  const [broken, setBroken] = useState(false);
  const [allowOfficial, setAllowOfficial] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const uid = useId().replace(/:/g, "");
  const arms = blazon(name);
  const path = CUTS[arms.cut];
  const letters = lettersOf(name);
  const officialSrc = allowOfficial && official && !broken ? official : null;
  const fallbackSrc = logo && !logoBroken ? logo : null;
  const src = officialSrc || fallbackSrc;
  const showLogo = Boolean(src);
  const letterFill = arms.field.metal ? arms.ink.fill : "var(--tincture-argent)";

  useEffect(() => {
    setBroken(false);
    setLogoBroken(false);
  }, [official, logo]);

  useEffect(() => {
    setAllowOfficial(true);
  }, []);

  return (
    <span className={cn("crest-plate", SIZES[size], className)} title={name} aria-hidden>
      <svg viewBox="0 0 80 96" className="size-full">
        <defs>
          <clipPath id={`shield-${uid}`}>
            <path d={path} />
          </clipPath>
          <linearGradient id={`enamel-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.22" />
            <stop offset="38%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id={`gold-${uid}`} x1="0.12" y1="0" x2="0.88" y2="1">
            <stop offset="0%" stopColor="var(--tincture-or-bright)" />
            <stop offset="28%" stopColor="var(--tincture-or)" />
            <stop offset="62%" stopColor="var(--tincture-or-deep)" />
            <stop offset="100%" stopColor="var(--tincture-or-bright)" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#shield-${uid})`}>
          <path d={path} fill={showLogo ? "var(--tincture-argent)" : arms.field.fill} />
          {showLogo ? null : <OrdinaryMark kind={arms.ordinary} ink={arms.ink.fill} />}
          {showLogo ? null : <ChargeMark kind={arms.charge} fill={letterFill} />}
          {showLogo ? (
            <foreignObject x="6" y="9" width="68" height="70">
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: 68, height: 70 }}>
                <img
                  src={src ?? undefined}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: "68px", height: "70px", objectFit: "contain", display: "block" }}
                  onError={() => {
                    if (officialSrc) setBroken(true);
                    else setLogoBroken(true);
                  }}
                />
              </div>
            </foreignObject>
          ) : null}
          <path d={path} fill={`url(#enamel-${uid})`} />
        </g>
        <path
          d={path}
          fill="none"
          stroke="var(--tincture-sable)"
          strokeWidth="5.4"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke={`url(#gold-${uid})`}
          strokeWidth="3.6"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--tincture-or-bright)"
          strokeWidth="0.9"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />
        {showLogo ? null : (
          <Lettering ordinary={arms.ordinary} letters={letters} field={arms.field.fill} ink={arms.ink.fill} />
        )}
      </svg>
    </span>
  );
}
