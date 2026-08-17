import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_COUNT } from "@/lib/consensus";

export const Route = createFileRoute("/playbook")({ component: PlaybookPage });

const STEPS = [
  {
    n: "01",
    title: "Today's fixtures",
    body: "Every upcoming match, score, and price for the day sits on one board. Open a row to see how the sites lined up.",
  },
  {
    n: "02",
    title: "Twenty-two sites",
    body: "Each desk is a public tip method — price, form, Poisson, Elo, home bias, fade, and sixteen more. Together they read like twenty-odd tip sites.",
  },
  {
    n: "03",
    title: "High, medium, low",
    body: "High is 70%+ of sites on the same pick. Medium is 50–69%. Low is a split board. Filter the fixtures list by that band.",
  },
  {
    n: "04",
    title: "Grade the book",
    body: "Finished matches are scored after the whistle. Form never uses the game being graded. One unit at the posted number.",
  },
  {
    n: "05",
    title: "Read current form",
    body: "League tables for most and least wins, draws, losses, and goals — with home and away splits. Cups stay out.",
  },
];

function PlaybookPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-subtle uppercase">Method</p>
        <h1 className="font-display mt-2 text-3xl fold:text-4xl">Playbook</h1>
        <p className="mt-3 text-muted-foreground">
          Betagree is a live soccer consensus desk. It ranks today's fixtures by how many of{" "}
          {SITE_COUNT} tip sites land on the same pick.
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
              <Row k="High" v="70% or more of the sites that posted this market land on the same side." />
              <Row k="Medium" v="A real lean — half to two-thirds of the sites. Check who faded." />
              <Row k="Low" v="Split board. The fixture stays listed; it is not a pack pick." />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Limits</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Kick-offs, scores, and prices are live. Betagree is not a sportsbook and does not place
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
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-24 shrink-0 font-semibold">{k}</dt>
      <dd className="text-muted-foreground">{v}</dd>
    </div>
  );
}
