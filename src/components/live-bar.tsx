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
      <span className="glass-gules inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-hot-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-or" />
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
  emptyLabel,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">Reading the live board…</p>;
  }
  if (error) {
    return <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-hot">{error}</p>;
  }
  if (empty) {
    return (
      <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel ?? "No fixtures on the board for this window."}
      </p>
    );
  }
  return null;
}
