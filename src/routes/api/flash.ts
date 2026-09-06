import { createFileRoute } from "@tanstack/react-router";
import { readPublicJson } from "@/lib/read-public-json";

export const Route = createFileRoute("/api/flash")({
  server: { handlers: { GET: async () => readPublicJson("data/flash.json") } },
});
