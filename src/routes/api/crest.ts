import { createWriteStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { findCrestOnline } from "@/lib/crest-online";
import { distinctiveConflict, normTeam, resolveCrestPath } from "@/lib/official-crests";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const BASE = "https://img.sofascore.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const jobs = new Map<string, Promise<{ path: string | null; remote: string | null }>>();

async function loadIndex(): Promise<{ byName: Record<string, string>; files?: Record<string, string> }> {
  try {
    return JSON.parse(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {} };
  }
}

/** Merge-only write. Never replace a fat index with a near-empty one. */
async function saveIndex(index: { byName: Record<string, string>; files?: Record<string, string> }) {
  const disk = await loadIndex();
  const byName = { ...(disk.byName ?? {}), ...(index.byName ?? {}) };
  const files = { ...(disk.files ?? {}), ...(index.files ?? {}) };
  const diskN = Object.keys(disk.byName ?? {}).length;
  const nextN = Object.keys(byName).length;
  if (diskN >= 50 && nextN < Math.floor(diskN * 0.5)) {
    console.error("[crest] refuse shrink index", diskN, "->", nextN);
    return;
  }
  await writeFile(
    INDEX,
    JSON.stringify({ byName, files, mapped: nextN, updatedAt: new Date().toISOString() }),
  );
}

async function download(url: string, dest: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/png,image/*,*/*", Referer: "https://www.sofascore.com/" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) throw new Error("tiny");
}

function pickTeam(
  name: string,
  results: {
    type?: string;
    entity?: {
      id?: number;
      name?: string;
      shortName?: string;
      sport?: { slug?: string; id?: number };
      gender?: string;
      userCount?: number;
    };
  }[],
) {
  const q = normTeam(name);
  let best: { id: number; name: string; score: number; users: number } | null = null;
  for (const item of results ?? []) {
    if (item.type !== "team") continue;
    const e = item.entity ?? {};
    if (e.sport?.slug && e.sport.slug !== "football") continue;
    if (e.sport?.id && e.sport.id !== 1) continue;
    const label = String(e.name ?? "");
    const short = String(e.shortName ?? "");
    const n1 = normTeam(label);
    const n2 = normTeam(short);
    let score = 0;
    if (n1 === q || n2 === q) score = 1;
    else if (distinctiveConflict(q, n1) || (n2 && distinctiveConflict(q, n2))) score = 0;
    else if (n1.startsWith(q) || q.startsWith(n1)) score = 0.9;
    else {
      const qt = q.split(" ").filter((t) => t.length > 2);
      const rt = n1.split(" ").filter((t) => t.length > 2);
      if (qt.length && rt.length) {
        let hit = 0;
        for (const t of qt) if (rt.includes(t)) hit += 1;
        score = hit / Math.max(qt.length, rt.length);
      }
    }
    if (score < 0.62 || !e.id) continue;
    const users = e.userCount ?? 0;
    if (!best || score > best.score || (score === best.score && users > best.users)) {
      best = { id: e.id, name: label, score, users };
    }
  }
  return best;
}

async function sofascoreUrl(name: string): Promise<string | null> {
  const data = await fetch(`${BASE}/api/v1/search/all?q=${encodeURIComponent(name)}`, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Origin: "https://www.sofascore.com",
      Referer: "https://www.sofascore.com/",
    },
    signal: AbortSignal.timeout(12_000),
  }).then((r) => (r.ok ? r.json() : { results: [] }));
  const picked = pickTeam(name, data.results ?? []);
  if (!picked) return null;
  return `${BASE}/api/v1/team/${picked.id}/image`;
}

function slug(name: string) {
  return normTeam(name).replace(/\s+/g, "-").slice(0, 48) || "club";
}

async function resolveName(name: string): Promise<{ path: string | null; remote: string | null }> {
  const key = normTeam(name);
  const index = await loadIndex();
  const existing = resolveCrestPath(name, index.byName ?? {});
  if (existing) return { path: existing, remote: existing.startsWith("http") ? existing : null };

  const remote = (await sofascoreUrl(name)) ?? (await findCrestOnline(name));
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
      return { path: null, remote };
    }
  }
  const path = `/crests/${file}`;
  index.byName ??= {};
  index.byName[key] = path;
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
