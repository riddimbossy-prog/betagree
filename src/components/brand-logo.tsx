import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-h-9 items-center rounded-full px-4 text-sm font-semibold tracking-tight text-primary-foreground glass-purpure",
        className,
      )}
      aria-label="Betagree.com"
    >
      <span className="whitespace-nowrap">
        Bet
        <span className="font-serif italic font-normal">agree</span>
        <span className="font-medium opacity-70">.com</span>
      </span>
    </span>
  );
}
