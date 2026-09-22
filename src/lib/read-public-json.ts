import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseJsonLoose } from "@/lib/safe-fetch";

export async function readPublicJson(rel: string): Promise<Response> {
  try {
    const raw = await readFile(join(process.cwd(), "public", rel), "utf8");
    const recovered = parseJsonLoose(raw, null);
    if (recovered == null) {
      return Response.json({ error: `Invalid ${rel}` }, { status: 502 });
    }
    return new Response(JSON.stringify(recovered), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=30",
      },
    });
  } catch (err) {
    console.error("[data]", rel, err);
    return Response.json({ error: `Failed to load ${rel}` }, { status: 502 });
  }
}
