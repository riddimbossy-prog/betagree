import { createFileRoute } from "@tanstack/react-router";
import { getLedger } from "@/lib/live/store";

export const Route = createFileRoute("/api/ledger")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await getLedger();
          return Response.json(data, {
            headers: { "Cache-Control": "public, max-age=120" },
          });
        } catch (err) {
          console.error("[ledger]", err);
          return Response.json({ error: "Failed to load ledger" }, { status: 502 });
        }
      },
    },
  },
});
