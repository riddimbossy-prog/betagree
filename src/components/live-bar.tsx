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
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-xs tracking-wider uppercase">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 bg-loss" />
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
      <p className="border-2 border-ink bg-card px-4 py-8 text-center">Reading the live board…</p>
    );
  }
  if (error) {
    return <p className="border-2 border-ink bg-card px-4 py-8 text-center text-loss">{error}</p>;
  }
  if (empty) {
    return (
      <p className="border-2 border-ink bg-card px-4 py-8 text-center">
        No fixtures on the board for this window. Check back closer to kickoff.
      </p>
    );
  }
  return null;
}
