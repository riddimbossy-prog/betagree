import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const Route = createFileRoute("/api/form")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const raw = await readFile(join(process.cwd(), "public/data/form.json"), "utf8");
          return new Response(raw, {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "public, max-age=30",
            },
          });
        } catch (err) {
          console.error("[form]", err);
          return Response.json({ error: "Failed to load form" }, { status: 502 });
        }
      },
    },
  },
});