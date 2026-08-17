import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

function friendly(error: unknown) {
  if (error instanceof Error && error.message && error.message.length < 140 && !/https?:\/\//.test(error.message)) {
    return error.message;
  }
  return "The board hit a fault. Your last view is safe — try again.";
}

export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <span className="text-hot" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl font-medium">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">{friendly(error)}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold glass-or text-or"
        >
          Try again
        </button>
        <a href="/" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm glass">
          Back to the board
        </a>
      </div>
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
