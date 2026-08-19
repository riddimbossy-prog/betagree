import { createFileRoute } from "@tanstack/react-router";
import { Download, Share, Smartphone } from "lucide-react";
import { APK_HREF } from "@/components/install-gate";

export const Route = createFileRoute("/get-app")({ component: GetAppPage });

export function GetAppPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <header>
        <p className="text-xs tracking-widest text-subtle uppercase">App</p>
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Get the <span className="font-serif italic font-normal">app</span>
        </h1>
        <p className="mt-3 text-sm text-subtle">
          Android installs the Betagree package. iPhone adds the desk to your Home Screen.
        </p>
      </header>

      <a
        href={APK_HREF}
        download="betagree.apk"
        className="glass-lime flex items-center justify-center gap-2 rounded-full px-6 py-4 text-center text-base font-semibold text-primary-foreground no-underline"
      >
        <Download className="size-5" />
        Download Android APK
      </a>

      <div className="glass space-y-3 rounded-3xl p-5 text-sm leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <Smartphone className="size-4" /> iPhone
        </p>
        <ol className="space-y-2">
          <li>
            <b className="text-foreground">1.</b> Open betagree.com in Safari.
          </li>
          <li>
            <b className="text-foreground">2.</b> Tap <Share className="mx-0.5 inline size-3.5 align-[-2px]" /> Share, then Add to Home Screen.
          </li>
          <li>
            <b className="text-foreground">3.</b> Tap Add. The purple lockup is your icon.
          </li>
        </ol>
      </div>

      <p className="text-xs text-subtle">Betagree is not a sportsbook and does not place bets. 18+ / 21+ where betting is legal.</p>
    </div>
  );
}
