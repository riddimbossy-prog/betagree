import { createFileRoute } from "@tanstack/react-router";
import { readPublicJson } from "@/lib/read-public-json";

export const Route = createFileRoute("/api/sporty-scan")({
  server: {
    handlers: {
      GET: async () => readPublicJson("data/sporty-scan.json"),
    },
  },
});
