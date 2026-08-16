import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/playbook")({ component: PlaybookPage });

const STEPS = [
  {
    n: "01",
    title: "Pull today's slate",
    body: "Fixtures, scores, and DraftKings prices come off the live ESPN soccer board every 45 seconds. No baked card.",
  },
  {
    n: "02",
    title: "Three live desks",
    body: "Market follows the posted 1X2 and total. Form uses the last five settled results. Attack compares recent goals for and against.",
  },
  {
    n: "03",
    title: "Count the pack",
    body: "A consensus pick is the leading selection when at least two desks post the same side. Unanimous means they all landed together.",
  },
  {
    n: "04",
    title: "Grade the book",
    body: "The last 21 days of finished matches are scored walk-forward — form never sees the game being graded. One unit at the posted number.",
  },
];

function PlaybookPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-subtle uppercase">Method</p>
        <h1 className="font-display mt-2 text-4xl">Playbook</h1>
        <p className="mt-3 text-muted-foreground">
          Linework is a live soccer consensus desk. It does not invent tipsters. It tells you where
          the price and the recent numbers overlap on today's fixtures.
        </p>
      </header>

      <ol className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-card p-5 shadow-border">
            <p className="font-mono text-xs text-subtle">{s.n}</p>
            <h2 className="font-display mt-2 text-2xl">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">What the number means</h2>
            <dl className="mt-4 divide-y divide-border text-sm">
              <Row k="3/3" v="Market, form, and attack all on the same side." />
              <Row k="2/3" v="A real lean. Check who faded — often the market vs the form." />
              <Row k="Split" v="No consensus. The fixture stays on the slate; it does not make the card." />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Limits</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Kick-offs, scores, and prices are live. Linework is not a sportsbook and does not place
              bets. 18+ / 21+ where betting is legal. ncpgambling.org
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[80px_1fr] sm:gap-4">
      <dt className="font-medium">{k}</dt>
      <dd className="text-muted-foreground">{v}</dd>
    </div>
  );
}
