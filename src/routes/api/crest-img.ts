import { createWriteStream } from "node:fs";
import { readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { findCrestOnline } from "@/lib/crest-online";
import { normTeam, resolveCrestPath, sofaIdOf, sofaMirror, toLocalCrest } from "@/lib/official-crests";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const jobs = new Map<string, Promise<string | null>>();

function parseIndex(raw: string): { byName: Record<string, string> } {
  try {
    return JSON.parse(raw);
  } catch {
    return { byName: {} };
  }
}

async function loadIndex() {
  try {
    return parseIndex(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {} };
  }
}

async function download(url: string, dest: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/png,image/webp,image/*,*/*",
      Referer: "https://www.sofascore.com/",
      Origin: "https://www.sofascore.com",
    },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) {
    await unlink(dest).catch(() => undefined);
    throw new Error("tiny");
  }
}

async function fileIfPresent(file: string): Promise<string | null> {
  const dest = join(OUT, file);
  try {
    const st = await stat(dest);
    if (st.size >= 250) return dest;
  } catch {
    /* missing */
  }
  return null;
}

async function materializeId(id: string): Promise<string | null> {
  const file = `ss-${id}.png`;
  const existing = await fileIfPresent(file);
  if (existing) return existing;
  const dest = join(OUT, file);
  await download(`https://img.sofascore.com/api/v1/team/${id}/image`, dest);
  return dest;
}

async function materializeName(name: string): Promise<string | null> {
  const index = await loadIndex();
  const mapped = resolveCrestPath(name, index.byName ?? {});
  const id = sofaIdOf(mapped);
  if (id) return materializeId(id);
  const local = toLocalCrest(mapped);
  if (local) {
    const dest = join(OUT, local.replace("/crests/", ""));
    const hit = await fileIfPresent(local.replace("/crests/", ""));
    if (hit) return hit;
    const remote = sofaMirror(mapped);
    if (remote) {
      await download(remote, dest);
      return dest;
    }
  }
  const remote = await findCrestOnline(name);
  const foundId = sofaIdOf(remote);
  if (foundId) return materializeId(foundId);
  return null;
}

async function pngResponse(abs: string) {
  const buf = await readFile(abs);
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const Route = createFileRoute("/api/crest-img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id")?.trim() ?? "";
        const name = url.searchParams.get("name")?.trim() ?? "";
        const key = id ? `id:${id}` : `name:${normTeam(name)}`;
        if (!id && !name) return new Response("missing", { status: 400 });
        try {
          let job = jobs.get(key);
          if (!job) {
            job = (id ? materializeId(id) : materializeName(name)).finally(() => jobs.delete(key));
            jobs.set(key, job);
          }
          const dest = await job;
          if (!dest) return new Response("missing", { status: 404 });
          return await pngResponse(dest);
        } catch (err) {
          console.error("[crest-img]", id || name, err);
          return new Response("fail", { status: 502 });
        }
      },
    },
  },
});
