import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-12 min-h-12 items-center rounded-full px-5 text-base font-semibold tracking-tight text-primary-foreground glass-purpure fold:h-14 fold:min-h-14 fold:px-6 fold:text-lg",
        className,
      )}
      aria-label="Betagree.com"
    >
      <span className="whitespace-nowrap">Betagree.com</span>
    </span>
  );
}
