import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/get-app")({ component: GetAppPage });

const APK = "/app/betagree.apk";

export function GetAppPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <header>
        <p className="text-xs tracking-widest text-subtle uppercase">Android</p>
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Get the <span className="font-serif italic font-normal">app</span>
        </h1>
        <p className="mt-3 text-sm text-subtle">
          Betagree on your phone. Same desk, home screen icon. Not on the Play Store — install the package directly.
        </p>
      </header>

      <a
        href={APK}
        download="betagree.apk"
        className="glass-lime flex items-center justify-center rounded-full px-6 py-4 text-center text-base font-semibold text-primary-foreground no-underline"
      >
        Download Android app
      </a>

      <ol className="glass space-y-3 rounded-3xl p-5 text-sm leading-relaxed text-muted-foreground">
        <li>
          <b className="text-foreground">1.</b> Tap download. Allow the file if your phone asks.
        </li>
        <li>
          <b className="text-foreground">2.</b> Open the file. If Android blocks it, allow installs from this browser, then tap again.
        </li>
        <li>
          <b className="text-foreground">3.</b> Betagree appears on your home screen. The board stays live.
        </li>
      </ol>

      <p className="text-xs text-subtle">Betagree is not a sportsbook and does not place bets. 18+ / 21+ where betting is legal.</p>
    </div>
  );
}
