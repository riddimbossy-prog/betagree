import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "header",
}: {
  className?: string;
  size?: "header" | "hero";
}) {
  const hero = size === "hero";
  return (
    <span
      className={cn("brand-lockup", hero ? "brand-lockup-hero" : "brand-lockup-header", className)}
      aria-label="Betagree.com — where every soccer tip agrees"
    >
      <span className="brand-word">
        <span>Betagree.c</span>
        <img
          className="brand-ball"
          src="/brand/soccer-ball.svg"
          alt=""
          width={64}
          height={64}
          draggable={false}
        />
        <span>m</span>
      </span>
      <span className="brand-tag">…where every soccer tip agrees</span>
    </span>
  );
}
