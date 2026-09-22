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

export function utcTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function utcDayKey(input?: string | Date | null): string | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isValid(input) ? input.toISOString().slice(0, 10) : null;
  }
  const text = String(input).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dated = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dated) {
    const [, dd, mm, yyyy] = dated;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = toDate(text);
  return d ? d.toISOString().slice(0, 10) : null;
}

export function calendarTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isPlayingToday(iso?: string | null, raw?: string | null, boardDate?: string | null) {
  const key = utcDayKey(iso) ?? utcDayKey(raw);
  if (!key) return false;
  if (key === utcTodayKey() || key === calendarTodayKey()) return true;
  return Boolean(boardDate && key === boardDate);
}

export function isPlayingTomorrow(iso?: string | null, raw?: string | null) {
  const key = utcDayKey(iso) ?? utcDayKey(raw);
  if (!key) return false;
  return key === new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export function fixtureIsToday(fixture?: { start?: string | null; date?: string | null; kickoff?: string | null } | null) {
  if (!fixture) return false;
  return isPlayingToday(fixture.start, fixture.kickoff ?? fixture.date);
}

export function sortBoardGames<T extends { live?: boolean; start?: string | null; status?: string }>(list: T[]) {
  return [...list].sort((a, b) => {
    const live = Number(Boolean(b.live)) - Number(Boolean(a.live));
    if (live) return live;
    return String(a.start ?? "").localeCompare(String(b.start ?? ""));
  });
}

export function marketLabel(market: string) {
  const map: Record<string, string> = {
    "1x2": "1X2",
    total: "Total",
    btts: "GG",
    dnb: "DNB",
    dc: "Double chance",
    ht_total: "First half",
    ht_btts: "HT GG",
  };
  return map[market] ?? market;
}
