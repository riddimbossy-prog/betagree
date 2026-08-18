import type { ScorePatch } from "./score-apply";

type LiveMsg = { t: string; s?: unknown[]; at?: string };
type Handler = (scores: ScorePatch[]) => void;

const handlers = new Set<Handler>();
let socket: WebSocket | null = null;
let retry: number | null = null;
let backoff = 700;
let open = false;
let last: ScorePatch[] = [];
let hidden = false;

function unpack(row: unknown): ScorePatch | null {
  if (!Array.isArray(row) || row.length < 4) return null;
  const home = String(row[0] ?? "");
  const away = String(row[1] ?? "");
  if (!home || !away) return null;
  return {
    home,
    away,
    homeScore: Number(row[2] ?? 0),
    awayScore: Number(row[3] ?? 0),
    live: Boolean(row[4]),
    detail: String(row[5] ?? ""),
    status: row[6] === "in" || row[6] === "post" || row[6] === "pre" ? row[6] : row[4] ? "in" : "pre",
  };
}

function merge(incoming: ScorePatch[], mode: "snap" | "diff") {
  if (mode === "snap") return incoming;
  const next = new Map(last.map((p) => [`${p.home}|${p.away}`, p]));
  for (const p of incoming) next.set(`${p.home}|${p.away}`, p);
  return [...next.values()];
}

function emit(scores: ScorePatch[]) {
  last = scores;
  for (const fn of handlers) fn(scores);
}

function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/live`;
}

function send(obj: unknown) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(obj));
}

function connect() {
  if (typeof window === "undefined" || socket || !handlers.size) return;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    schedule();
    return;
  }
  socket.onopen = () => {
    open = true;
    backoff = 700;
    send({ t: hidden ? "pause" : "resume" });
  };
  socket.onmessage = (event) => {
    let msg: LiveMsg;
    try {
      msg = JSON.parse(String(event.data)) as LiveMsg;
    } catch {
      return;
    }
    if (msg.t === "ping") {
      send({ t: "pong" });
      return;
    }
    if (msg.t !== "snap" && msg.t !== "diff") return;
    const rows = (msg.s ?? []).map(unpack).filter((p): p is ScorePatch => Boolean(p));
    emit(merge(rows, msg.t));
  };
  socket.onerror = () => {
    /* close handler reconnects */
  };
  socket.onclose = () => {
    open = false;
    socket = null;
    if (handlers.size) schedule();
  };
}

function schedule() {
  if (retry != null || !handlers.size || hidden) return;
  retry = window.setTimeout(() => {
    retry = null;
    connect();
  }, backoff);
  backoff = Math.min(18_000, Math.round(backoff * 1.7));
}

let closeTimer: number | null = null;

function disconnect() {
  if (retry != null) {
    window.clearTimeout(retry);
    retry = null;
  }
  if (closeTimer != null) window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    closeTimer = null;
    if (handlers.size) return;
    socket?.close();
    socket = null;
    open = false;
  }, 400);
}

function onVisibility() {
  hidden = document.visibilityState === "hidden";
  if (hidden) send({ t: "pause" });
  else {
    send({ t: "resume" });
    if (!socket && handlers.size) connect();
  }
}

export function isLiveSocketOpen() {
  return open;
}

export function subscribeLiveScores(fn: Handler) {
  handlers.add(fn);
  if (closeTimer != null) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (last.length) fn(last);
  if (handlers.size === 1 && typeof window !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    hidden = document.visibilityState === "hidden";
    connect();
  }
  return () => {
    handlers.delete(fn);
    if (!handlers.size) {
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    }
  };
}
