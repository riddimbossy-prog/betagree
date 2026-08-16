import { formatWhen } from "@/lib/format";

export function LiveBar({
  fetchedAt,
  liveCount,
}: {
  fetchedAt?: string;
  liveCount?: number;
}) {
  const ago = fetchedAt ? formatWhen(fetchedAt) : "";
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-subtle uppercase">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-primary">
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
        Live
      </span>
      {ago ? <span>Updated {ago}</span> : null}
      {liveCount ? <span>{liveCount} in play</span> : null}
    </p>
  );
}

export function BoardState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
}) {
  if (loading) {
    return (
      <p className="rounded-lg bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-border">
        Reading the live board…
      </p>
    );
  }
  if (error) {
    return (
      <p className="rounded-lg bg-card px-4 py-8 text-center text-sm text-loss shadow-border">{error}</p>
    );
  }
  if (empty) {
    return (
      <p className="rounded-lg bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-border">
        No fixtures on the board for this window. Check back closer to kickoff.
      </p>
    );
  }
  return null;
}
