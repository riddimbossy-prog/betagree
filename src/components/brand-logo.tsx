import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 min-h-10 max-w-full items-center rounded-full px-3.5 text-sm font-semibold tracking-tight text-primary-foreground glass-purpure fold:h-12 fold:min-h-12 fold:px-5 fold:text-base",
        className,
      )}
      aria-label="Betagree.com"
    >
      <span className="whitespace-nowrap">Betagree.com</span>
    </span>
  );
}
