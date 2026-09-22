import { createFileRoute } from "@tanstack/react-router";
import { getSlate } from "@/lib/live/store";

export const Route = createFileRoute("/api/slate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const fresh = new URL(request.url).searchParams.has("fresh");
          const data = await getSlate(fresh);
          return Response.json(data, {
            headers: { "Cache-Control": "public, max-age=30" },
          });
        } catch (err) {
          console.error("[slate]", err);
          return Response.json({ error: "Failed to load today's slate" }, { status: 502 });
        }
      },
    },
  },
});
