import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/board")({
  component: () => <Navigate to="/fixtures" />,
});
