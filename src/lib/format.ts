import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatKickoff(iso: string) {
  const d = parseISO(iso);
  return format(d, "HH:mm") + " UTC";
}

export function formatKickoffLong(iso: string) {
  const d = parseISO(iso);
  return format(d, "EEE d MMM · HH:mm") + " UTC";
}

export function formatWhen(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
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
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
