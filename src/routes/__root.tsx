import { AppErrorComponent, AppNotFound } from "@/lib/error-component";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteShell } from "@/components/site-shell";
import { SnapshotProvider } from "@/lib/live/snapshot-context";
import { loadAppSnapshot } from "@/lib/live/snapshot";
import appCss from "../styles.css?url";

const APP_NAME = "Betagree";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME ?? "betagree.com";
const ogImage = `https://og.grok.me/v1/card.png?host=${encodeURIComponent(host)}&title=${encodeURIComponent(APP_NAME)}`;

export const Route = createRootRoute({
  loader: async () => {
    try {
      return await loadAppSnapshot();
    } catch {
      return {
        slate: null,
        form: null,
        trends: null,
        streaks: null,
        ledger: null,
      };
    }
  },
  notFoundComponent: AppNotFound,
  errorComponent: AppErrorComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      {
        title: "Betagree — today's soccer consensus",
      },
      {
        name: "description",
        content:
          "Today's soccer fixtures, compared across live desks. Betagree ranks the picks they actually agree on.",
      },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#12101a" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: APP_NAME },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const snap = Route.useLoaderData();
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <SnapshotProvider value={snap}>
            <SiteShell>
              <Outlet />
            </SiteShell>
          </SnapshotProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}