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
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
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
    return <p className="rounded-3xl bg-card px-4 py-10 text-center text-sm text-muted-foreground">Reading the live board…</p>;
  }
  if (error) {
    return <p className="rounded-3xl bg-card px-4 py-10 text-center text-sm text-hot">{error}</p>;
  }
  if (empty) {
    return (
      <p className="rounded-3xl bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No fixtures on the board for this window.
      </p>
    );
  }
  return null;
}
