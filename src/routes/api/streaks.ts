import { createFileRoute } from "@tanstack/react-router";
import { readPublicJson } from "@/lib/read-public-json";

export const Route = createFileRoute("/api/streaks")({
  server: {
    handlers: {
      GET: async () => readPublicJson("data/streaks.json"),
    },
  },
});
