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
  return d ? format(d, "HH:mm") : "TBD";
}

export function formatKickoffLong(iso: string) {
  const d = toDate(iso);
  return d ? format(d, "EEE d MMM · HH:mm") : "TBD";
}

export function formatWhen(iso: string) {
  const d = toDate(iso);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "";
}

export function formatBoardTime(raw?: string | null, iso?: string | null) {
  const fromIso = toDate(iso);
  if (fromIso) {
    return { clock: format(fromIso, "HH:mm"), day: format(fromIso, "EEE d MMM") };
  }
  const text = String(raw ?? "").trim();
  if (!text) return { clock: "TBD", day: null as string | null };

  const dated = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (dated) {
    const [, dd, mm, yyyy, hh, min] = dated;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    if (isValid(d)) return { clock: format(d, "HH:mm"), day: format(d, "EEE d MMM") };
  }

  const clockOnly = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clockOnly) {
    return { clock: `${clockOnly[1].padStart(2, "0")}:${clockOnly[2]}`, day: null };
  }

  const parsed = toDate(text);
  if (parsed) return { clock: format(parsed, "HH:mm"), day: format(parsed, "EEE d MMM") };

  return { clock: text, day: null as string | null };
}

export function formatBoardTimeLine(raw?: string | null, iso?: string | null) {
  const { clock, day } = formatBoardTime(raw, iso);
  return day ? `${day} · ${clock}` : clock;
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
