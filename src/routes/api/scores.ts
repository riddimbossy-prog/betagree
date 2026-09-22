import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const PATHS = [join(tmpdir(), "board-scores.json"), join(process.cwd(), "public/data/scores.json")];

async function readFirst() {
  for (const path of PATHS) {
    try {
      return await readFile(path, "utf8");
    } catch {
      /* try next */
    }
  }
  return null;
}

export const Route = createFileRoute("/api/scores")({
  server: {
    handlers: {
      GET: async () => {
        const body = await readFirst();
        if (!body) return Response.json({ fetchedAt: new Date().toISOString(), scores: [] });
        return new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3, stale-while-revalidate=15",
          },
        });
      },
    },
  },
});
