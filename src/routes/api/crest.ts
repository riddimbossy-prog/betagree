import { createWriteStream } from "node:fs";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { findCrestOnline } from "@/lib/crest-online";
import { nameKeys, normTeam, resolveCrestPath, sofaMirror } from "@/lib/official-crests";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const jobs = new Map<string, Promise<{ path: string | null; remote: string | null }>>();
let writeChain: Promise<void> = Promise.resolve();

function parseIndex(raw: string): { byName: Record<string, string>; files?: Record<string, string> } {
  try {
    return JSON.parse(raw);
  } catch {
    // Recover a raced append: first complete object only
    const start = raw.indexOf("{");
    if (start < 0) return { byName: {} };
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(raw.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
    return { byName: {} };
  }
}

async function loadIndex(): Promise<{ byName: Record<string, string>; files?: Record<string, string> }> {
  try {
    return parseIndex(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {} };
  }
}

/** Merge-only write. Atomic + serialized so two crest jobs cannot corrupt the file. */
async function saveIndex(index: { byName: Record<string, string>; files?: Record<string, string> }) {
  writeChain = writeChain.then(() => persistIndex(index)).catch((err) => {
    console.error("[crest] saveIndex", err);
  });
  await writeChain;
}

async function persistIndex(index: { byName: Record<string, string>; files?: Record<string, string> }) {
  const disk = await loadIndex();
  const byName = { ...(disk.byName ?? {}), ...(index.byName ?? {}) };
  const files = { ...(disk.files ?? {}), ...(index.files ?? {}) };
  const diskN = Object.keys(disk.byName ?? {}).length;
  const nextN = Object.keys(byName).length;
  let pngs = 0;
  try {
    pngs = (await readdir(OUT)).filter((f) => f.endsWith(".png")).length;
  } catch {
    pngs = 0;
  }
  if ((diskN >= 10 && nextN < diskN) || (pngs >= 200 && nextN < 200)) {
    console.error("[crest] refuse shrink index", { diskN, nextN, pngs });
    return;
  }
  const body = JSON.stringify({ byName, files, mapped: nextN, updatedAt: new Date().toISOString() });
  JSON.parse(body);
  const tmp = `${INDEX}.tmp`;
  await writeFile(tmp, body);
  await rename(tmp, INDEX);
}

async function download(url: string, dest: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/png,image/*,*/*",
      Referer: url.includes("sofascore") ? "https://www.sofascore.com/" : "https://en.wikipedia.org/",
    },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as unknown as import("stream/web").ReadableStream), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) throw new Error("tiny");
}

function slug(name: string) {
  return normTeam(name).replace(/\s+/g, "-").slice(0, 48) || "club";
}

async function resolveName(name: string): Promise<{ path: string | null; remote: string | null }> {
  const index = await loadIndex();
  const existing = resolveCrestPath(name, index.byName ?? {});
  if (existing) {
    const id = sofaMirror(existing);
    const local = existing.startsWith("/crests/")
      ? existing
      : existing.match(/team\/(\d+)/)?.[1]
        ? `/crests/ss-${existing.match(/team\/(\d+)/)?.[1]}.png`
        : existing;
    return { path: local, remote: id ?? (existing.startsWith("http") ? existing : null) };
  }

  const remote = await findCrestOnline(name);
  if (!remote) return { path: null, remote: null };

  const file = remote.includes("/team/")
    ? `ss-${remote.match(/team\/(\d+)/)?.[1] ?? slug(name)}.png`
    : `web-${slug(name)}.png`;
  const dest = join(OUT, file);
  try {
    await stat(dest);
  } catch {
    try {
      await download(remote, dest);
    } catch {
      // Still return a same-origin proxy so the browser never hotlinks SofaScore.
      const id = remote.match(/team\/(\d+)/)?.[1];
      const proxy = id ? `/api/crest-img?id=${id}` : `/api/crest-img?name=${encodeURIComponent(name)}`;
      index.byName ??= {};
      for (const k of nameKeys(name)) index.byName[k] = proxy;
      await saveIndex(index);
      return { path: proxy, remote };
    }
  }
  const path = `/crests/${file}`;
  index.byName ??= {};
  for (const k of nameKeys(name)) index.byName[k] = path;
  await saveIndex(index);
  return { path, remote };
}

export const Route = createFileRoute("/api/crest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
        if (!name) return Response.json({ path: null, remote: null }, { status: 400 });
        const key = normTeam(name);
        try {
          let job = jobs.get(key);
          if (!job) {
            job = resolveName(name).finally(() => jobs.delete(key));
            jobs.set(key, job);
          }
          const found = await job;
          return Response.json(found, {
            headers: { "Cache-Control": found.path ? "public, max-age=86400" : "public, max-age=30" },
          });
        } catch (err) {
          console.error("[crest]", name, err);
          return Response.json({ path: null, remote: null }, { status: 502 });
        }
      },
    },
  },
});
