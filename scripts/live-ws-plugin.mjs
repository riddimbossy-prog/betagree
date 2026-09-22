import { createHash } from "node:crypto";

const PATH = "/api/live";
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const TICK_MS = 3_000;
const PING_MS = 25_000;
const STALE_MS = 70_000;

function acceptKey(key) {
  return createHash("sha1").update(`${key}${GUID}`).digest("base64");
}

function encodeFrame(data, opcode = 1) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrames(buf) {
  const out = [];
  let offset = 0;
  while (offset + 2 <= buf.length) {
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const opcode = b0 & 0x0f;
    const masked = Boolean(b1 & 0x80);
    let len = b1 & 0x7f;
    let cursor = offset + 2;
    if (len === 126) {
      if (cursor + 2 > buf.length) break;
      len = buf.readUInt16BE(cursor);
      cursor += 2;
    } else if (len === 127) {
      if (cursor + 8 > buf.length) break;
      len = Number(buf.readBigUInt64BE(cursor));
      cursor += 8;
    }
    if (len > 64 * 1024) return { frames: out, rest: Buffer.alloc(0), overflow: true };
    const mask = masked ? 4 : 0;
    if (cursor + mask + len > buf.length) break;
    let payload = buf.subarray(cursor + mask, cursor + mask + len);
    if (masked) {
      const key = buf.subarray(cursor, cursor + 4);
      const copy = Buffer.from(payload);
      for (let i = 0; i < copy.length; i++) copy[i] ^= key[i & 3];
      payload = copy;
    }
    out.push({ opcode, payload });
    offset = cursor + mask + len;
  }
  return { frames: out, rest: buf.subarray(offset), overflow: false };
}

function pack(p) {
  return [p.home, p.away, p.homeScore, p.awayScore, p.live ? 1 : 0, p.detail ?? "", p.status ?? "pre"];
}

function stampOf(list) {
  return list
    .map((p) => `${p.home}|${p.away}|${p.homeScore}|${p.awayScore}|${p.live ? 1 : 0}|${p.detail}|${p.status}`)
    .sort()
    .join(";");
}

export function liveWsPlugin() {
  return {
    name: "betagree-live-ws",
    apply: "serve",
    configureServer(server) {
      /** @type {Set<{ socket: import('node:net').Socket, paused: boolean, seen: number, send: (obj: unknown) => void, ping: () => void }>} */
      const clients = new Set();
      let last = [];
      let lastStamp = "";
      let tick = 0;
      let ping = 0;
      let pulling = false;

      const sendAll = (obj, { skipPaused = false } = {}) => {
        const frame = encodeFrame(JSON.stringify(obj));
        for (const client of clients) {
          if (skipPaused && client.paused) continue;
          try {
            client.socket.write(frame);
          } catch {
            clients.delete(client);
          }
        }
      };

      const pull = async () => {
        if (pulling || !clients.size) return;
        pulling = true;
        try {
          const mod = (await server.ssrLoadModule("/src/lib/live/scores.ts")) ;
          const patches = await mod.getLivePatches("fast");
          const board = typeof mod.boardScores === "function" ? mod.boardScores(patches) : patches;
          const list = Array.isArray(board) ? board : [];
          const stamp = stampOf(list);
          if (stamp === lastStamp) return;
          const prev = new Map(last.map((p) => [`${p.home}|${p.away}`, p]));
          const changed = list.filter((p) => {
            const old = prev.get(`${p.home}|${p.away}`);
            return !old || stampOf([old]) !== stampOf([p]);
          });
          last = list;
          lastStamp = stamp;
          if (!changed.length) return;
          sendAll(
            {
              t: last.length && changed.length < last.length ? "diff" : "snap",
              at: new Date().toISOString(),
              s: (changed.length ? changed : list).map(pack),
            },
            { skipPaused: true },
          );
        } catch {
          /* keep last snapshot */
        } finally {
          pulling = false;
        }
      };

      const sweep = () => {
        const now = Date.now();
        for (const client of clients) {
          if (now - client.seen > STALE_MS) {
            try {
              client.socket.end();
            } catch {
              /* already gone */
            }
            clients.delete(client);
          }
        }
        if (!clients.size) {
          if (tick) {
            clearInterval(tick);
            tick = 0;
          }
          if (ping) {
            clearInterval(ping);
            ping = 0;
          }
        }
      };

      const startLoops = () => {
        if (!tick) tick = setInterval(() => void pull(), TICK_MS);
        if (!ping) {
          ping = setInterval(() => {
            for (const client of clients) client.ping();
            sweep();
          }, PING_MS);
        }
      };

      const attach = (socket) => {
        let rest = Buffer.alloc(0);
        const client = {
          socket,
          paused: false,
          seen: Date.now(),
          send(obj) {
            try {
              socket.write(encodeFrame(JSON.stringify(obj)));
            } catch {
              clients.delete(client);
            }
          },
          ping() {
            try {
              socket.write(encodeFrame(Buffer.alloc(0), 9));
            } catch {
              clients.delete(client);
            }
          },
        };
        clients.add(client);
        startLoops();
        client.send({ t: "hello", v: 1 });
        if (last.length) client.send({ t: "snap", at: new Date().toISOString(), s: last.map(pack) });
        else void pull();

        socket.on("data", (chunk) => {
          client.seen = Date.now();
          const decoded = decodeFrames(Buffer.concat([rest, chunk]));
          rest = decoded.rest;
          if (decoded.overflow) {
            socket.end();
            clients.delete(client);
            return;
          }
          for (const frame of decoded.frames) {
            if (frame.opcode === 8) {
              clients.delete(client);
              socket.end();
              return;
            }
            if (frame.opcode === 9) {
              socket.write(encodeFrame(frame.payload, 10));
              continue;
            }
            if (frame.opcode === 10) continue;
            if (frame.opcode !== 1) continue;
            try {
              const msg = JSON.parse(frame.payload.toString("utf8"));
              if (msg?.t === "pause") client.paused = true;
              if (msg?.t === "resume") {
                client.paused = false;
                if (last.length) client.send({ t: "snap", at: new Date().toISOString(), s: last.map(pack) });
              }
              if (msg?.t === "pong") client.seen = Date.now();
            } catch {
              /* ignore junk */
            }
          }
        });
        const drop = () => clients.delete(client);
        socket.on("close", drop);
        socket.on("error", drop);
      };

      const onUpgrade = (req, socket, head) => {
        const url = (req.url ?? "").split("?")[0];
        if (url !== PATH) return;
        const key = req.headers["sec-websocket-key"];
        if (!key || String(req.headers.upgrade || "").toLowerCase() !== "websocket") {
          socket.destroy();
          return;
        }
        socket.write(
          [
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${acceptKey(String(key))}`,
            "\r\n",
          ].join("\r\n"),
        );
        if (head?.length) socket.unshift(head);
        attach(socket);
      };

      const bind = (http) => {
        if (!http || http.__betagreeLive) return;
        http.__betagreeLive = true;
        http.on("upgrade", onUpgrade);
      };
      bind(server.httpServer);
      return () => bind(server.httpServer);
    },
  };
}
