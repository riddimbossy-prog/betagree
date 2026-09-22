import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tipsters")({
  component: () => <Outlet />,
});
