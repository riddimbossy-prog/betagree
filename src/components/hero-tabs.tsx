import { Link } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroTab = {
  id: string;
  label: string;
  value?: string | number;
  to?: string;
  hash?: string;
  tone?: "sport" | "live" | "or" | "azure" | "plain" | "high";
  active?: boolean;
};

export function HeroTabs({
  sport = "Football",
  sportNote = "Today",
  tabs,
}: {
  sport?: string;
  sportNote?: string;
  tabs: HeroTab[];
}) {
  return (
    <nav className="hero-tabs" aria-label="Board tabs">
      <div className="hero-tab hero-tab-sport" aria-current="page">
        <span className="hero-tab-mark">
          <CircleDot className="size-4" />
        </span>
        <span>
          <span className="hero-tab-sport-name">{sport}</span>
          <span className="hero-tab-label">{sportNote}</span>
        </span>
      </div>
      {tabs.map((tab) => {
        const className = cn(
          "hero-tab",
          tab.tone === "live" && "hero-tab-live",
          tab.tone === "or" && "hero-tab-or",
          tab.tone === "high" && "hero-tab-high",
          tab.tone === "azure" && "hero-tab-azure",
          tab.active && "hero-tab-active",
        );
        const inner = (
          <>
            {tab.value != null ? <span className="hero-tab-value">{tab.value}</span> : null}
            <span className="hero-tab-label">
              {tab.tone === "live" ? <span className="hero-tab-pip" /> : null}
              {tab.label}
            </span>
          </>
        );
        if (tab.to) {
          return (
            <Link key={tab.id} to={tab.to} hash={tab.hash} className={className}>
              {inner}
            </Link>
          );
        }
        return (
          <div key={tab.id} className={className}>
            {inner}
          </div>
        );
      })}
    </nav>
  );
}
