import { createFileRoute } from "@tanstack/react-router";
import { readPublicJson } from "@/lib/read-public-json";

export const Route = createFileRoute("/api/bankers")({
  server: {
    handlers: {
      GET: async () => readPublicJson("data/bankers.json"),
    },
  },
});
