import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground backdrop-blur-md",
        outline: "shadow-border text-muted-foreground backdrop-blur-md",
        win: "glass-or text-or",
        loss: "glass-gules text-hot-foreground",
        warn: "glass-or text-or",
        info: "glass-azure text-primary-foreground",
        solid: "glass-purpure text-primary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
