import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Flame,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AnalysisTile = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  badge: string;
  badgeHint?: string;
  to: string;
  icon: "crown" | "spark" | "flame" | "zap" | "gg" | "proof" | "live";
  size?: "lg" | "md";
  tone?: "or" | "high" | "live" | "purpure" | "azure" | "plain";
};

const ICONS = {
  crown: Target,
  spark: Sparkles,
  flame: Flame,
  zap: Zap,
  gg: TrendingUp,
  proof: CheckCircle2,
  live: Radio,
} as const;

function TileIcon({ name, tone }: { name: AnalysisTile["icon"]; tone?: AnalysisTile["tone"] }) {
  const Icon = ICONS[name];
  return (
    <span
      className={cn(
        "analysis-card-icon grid size-12 shrink-0 place-items-center rounded-2xl",
        tone === "high" && "glass-high text-band-high-foreground",
        tone === "live" && "glass-gules text-primary-foreground",
        tone === "or" && "glass-or text-or",
        tone === "purpure" && "glass-purpure text-primary-foreground",
        tone === "azure" && "glass-azure text-primary-foreground",
        (!tone || tone === "plain") && "glass text-or",
      )}
    >
      <Icon className="size-5" strokeWidth={2.2} />
    </span>
  );
}

function AnalysisCard({ tile, index = 0 }: { tile: AnalysisTile; index?: number }) {
  return (
    <Link
      to={tile.to}
      style={{ ["--enter-i" as string]: index }}
      className={cn(
        "analysis-card group glass block rounded-3xl p-5 no-underline",
        tile.size === "lg" && "fold:min-h-[9.5rem]",
      )}
    >
      <div className="flex items-start gap-4">
        <TileIcon name={tile.icon} tone={tile.tone} />
        <div className="min-w-0 flex-1">
          <p className="analysis-card-eyebrow text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
            {tile.eyebrow}
          </p>
          <h3 className="analysis-card-title mt-1 text-xl font-semibold text-foreground">
            {tile.title}
          </h3>
          <p className="analysis-card-body mt-2 text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
        </div>
        <div className="analysis-card-badge shrink-0 text-right">
          <p
            className={cn(
              "font-serif text-2xl italic leading-none tabular",
              tile.tone === "high" && "text-band-high",
              tile.tone === "live" && "text-hot",
              tile.tone === "or" && "text-or",
              tile.tone === "purpure" && "text-primary",
              tile.tone === "azure" && "text-info",
              (!tile.tone || tile.tone === "plain") && "text-or",
            )}
          >
            {tile.badge}
          </p>
          {tile.badgeHint ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
              {tile.badgeHint}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function AnalysisHub({
  kicker = "Betagree board hub",
  title = "Choose the analysis view",
  note = "Each board has a defined job. The homepage no longer mixes specialist systems into one small navigation row.",
  liveLabel = "Boards online",
  tiles,
}: {
  kicker?: string;
  title?: string;
  note?: string;
  liveLabel?: string;
  tiles: AnalysisTile[];
}) {
  const large = tiles.filter((t) => t.size !== "md");
  const medium = tiles.filter((t) => t.size === "md");

  return (
    <section className="analysis-hub">
      <div className="enter-up flex flex-wrap items-start justify-between gap-4" style={{ ["--enter-i" as string]: 0 }}>
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-or">{kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold fold:text-4xl">
            {title.includes("analysis") ? (
              <>
                Choose the <span className="font-serif italic font-normal">analysis</span> view
              </>
            ) : (
              title
            )}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{note}</p>
        </div>
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-or">
          <span className="size-2 rounded-full bg-band-high shadow-[0_0_12px_hsl(111_100%_50%/0.8)]" />
          {liveLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-3 fold:grid-cols-2">
        {large.map((tile, i) => (
          <AnalysisCard key={tile.id} tile={tile} index={i} />
        ))}
      </div>

      {medium.length ? (
        <div className="mt-3 grid gap-3 fold:grid-cols-3">
          {medium.map((tile, i) => (
            <AnalysisCard key={tile.id} tile={tile} index={large.length + i} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
