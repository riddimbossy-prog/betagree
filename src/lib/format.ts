import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

function toDate(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : parseISO(String(iso));
  if (isValid(d)) return d;
  const fallback = new Date(iso);
  return isValid(fallback) ? fallback : null;
}

export function formatKickoff(iso: string) {
  const d = toDate(iso);
  return d ? format(d, "HH:mm") + " UTC" : "TBD";
}

export function formatKickoffLong(iso: string) {
  const d = toDate(iso);
  return d ? format(d, "EEE d MMM · HH:mm") + " UTC" : "TBD";
}

export function formatWhen(iso: string) {
  const d = toDate(iso);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "";
}

export function marketLabel(market: string) {
  if (market === "1x2") return "1X2";
  if (market === "total") return "Total";
  if (market === "btts") return "BTTS";
  return market;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
