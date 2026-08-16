import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <span className="text-loss" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl font-medium">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted-foreground">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
    </main>
  );
}

export function AppNotFound() {
  return (
    <main className="grid min-h-[50vh] place-items-center px-6 text-center">
      <div>
        <p className="text-xs tracking-widest text-subtle uppercase">404</p>
        <h1 className="font-display mt-2 text-3xl">Not on the sheet</h1>
        <p className="mt-2 text-sm text-muted-foreground">That report or page is not in this desk.</p>
        <a href="/" className="mt-4 inline-block text-sm underline underline-offset-4">
          Back to the desk
        </a>
      </div>
    </main>
  );
}
