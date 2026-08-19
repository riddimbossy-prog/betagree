import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

export function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
      <header>
        <p className="text-xs tracking-widest text-subtle uppercase">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground fold:text-5xl">Privacy</h1>
        <p className="mt-3">Last updated 19 August 2026.</p>
      </header>
      <p>
        Betagree is a soccer consensus desk at betagree.com. It is not a sportsbook and does not place bets, take stakes, or hold a gambling licence.
      </p>
      <h2 className="text-lg font-semibold text-foreground">What we show</h2>
      <p>
        Fixtures, prices, crests, and consensus from public tip methods. That board is the product.
      </p>
      <h2 className="text-lg font-semibold text-foreground">What we collect</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>If you sign in, we store the account you use (Google or the provider you pick) so the desk can remember you on this device.</li>
        <li>The Android app loads betagree.com. It does not add extra tracking, ads, or a separate user database.</li>
        <li>Basic logs may be kept by the host (GitHub Pages) — IP, time, page — the same as any website.</li>
      </ul>
      <h2 className="text-lg font-semibold text-foreground">What we do not collect</h2>
      <p>No payment cards. No betting slips. No location. No advertising ID. We do not sell data.</p>
      <h2 className="text-lg font-semibold text-foreground">On your device</h2>
      <p>
        The Today filter and the install prompt use local storage on your phone. Clearing site data removes them.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Age</h2>
      <p>18+ (21+ where that is the law). Do not use Betagree to place a bet if that is illegal where you are.</p>
      <p>
        Questions: use the contact on the Google Play listing, or the GitHub repository for betagree.com.
      </p>
    </div>
  );
}
