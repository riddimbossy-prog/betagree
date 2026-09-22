import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { BoardState, LiveBar } from "@/components/live-bar";
import { FLASH_LABEL, FLASH_ORDER, FlashCard, flashKind } from "@/components/flash-card";
import { FLASH_COPY } from "@/lib/flash-copy";
import { isPlayingToday, isPlayingTomorrow } from "@/lib/format";
import { useFlash } from "@/lib/live/use-live";
import type { FlashPayload, FlashPick } from "@/lib/types";
import { cn } from "@/lib/utils";

const loadFlash = createIsomorphicFn()
  .server(async (): Promise<FlashPayload | null> => {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      return JSON.parse(await readFile(join(process.cwd(), "public/data/flash.json"), "utf8")) as FlashPayload;
    } catch { return null; }
  })
  .client(async (): Promise<FlashPayload | null> => {
    try { const r = await fetch("/data/flash.json", { cache: "no-store" }); return r.ok ? await r.json() : null; }
    catch { return null; }
  });

export const Route = createFileRoute("/flash")({ loader: loadFlash, component: FlashPage });
type When = "today" | "tomorrow" | "all";
const today = (p: FlashPick) => p.when === "today" || isPlayingToday(p.kickoff);
const tomorrow = (p: FlashPick) => !today(p) && (p.when === "tomorrow" || isPlayingTomorrow(p.kickoff));

function FlashPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading, reload } = useFlash(90_000, true, initial);
  const picks = data?.picks ?? [];
  const [when, setWhen] = useState<When>("today");
  const [kind, setKind] = useState("all");
  const [touched, setTouched] = useState(false);
  const todayN = picks.filter(today).length;
  const tomorrowN = picks.filter(tomorrow).length;
  useEffect(() => { if (!touched && data) setWhen(todayN ? "today" : tomorrowN ? "tomorrow" : "all"); }, [data, todayN, tomorrowN, touched]);
  const dated = useMemo(() => picks.filter((p) => when === "all" || (when === "today" ? today(p) : tomorrow(p))), [picks, when]);
  const visible = useMemo(() => kind === "all" ? dated : dated.filter((p) => flashKind(p) === kind), [dated, kind]);
  const groups = FLASH_ORDER.map((id) => ({ id, picks: visible.filter((p) => flashKind(p) === id) })).filter((g) => g.picks.length);
  const kinds = FLASH_ORDER.filter((id) => dated.some((p) => flashKind(p) === id));
  return <div className="flex flex-col gap-5 fold:gap-8">
    <header className="max-w-2xl"><LiveBar fetchedAt={data?.fetchedAt} /><h1 className="mt-2 text-3xl font-semibold fold:text-5xl">Flash <span className="font-serif italic font-normal">engine</span></h1>
      <p className="mt-2 text-sm text-subtle">{loading && !data ? "Loading…" : `${visible.length} picks from ${data?.scanned ?? 0} SportyBet matches`}</p>
      <p className="mt-2 text-sm text-muted-foreground">High-goal pricing, top-four favourites and the SportyBet 1X2 &amp; GG/NG combo market.</p></header>
    <details className="glass rounded-3xl p-4 fold:p-5"><summary className="cursor-pointer text-sm font-semibold">Exact rules</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-background/50 p-3 text-[11px] leading-relaxed">{FLASH_COPY}</pre></details>
    <div className="chip-row" role="group" aria-label="When">{([ ["today","Today",todayN], ["tomorrow","Tomorrow",tomorrowN], ["all","All",picks.length] ] as const).map(([id,label,n]) => <button key={id} type="button" onClick={() => {setTouched(true);setWhen(id);}} className={cn("shrink-0 rounded-full px-4 py-2 text-sm", when===id ? "glass-lime font-semibold text-primary-foreground":"glass text-muted-foreground")}>{label}<span className="ml-2 tabular">{n}</span></button>)}</div>
    {kinds.length > 1 ? <div className="chip-row" role="group" aria-label="Route">{kinds.map((id) => <button key={id} type="button" onClick={() => setKind(kind===id?"all":id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm",kind===id?"glass-purpure font-semibold text-primary-foreground":"glass text-muted-foreground")}>{FLASH_LABEL[id]}<span className="ml-2 tabular">{dated.filter((p)=>flashKind(p)===id).length}</span></button>)}</div>:null}
    <BoardState loading={loading&&!data} error={error} empty={!loading&&!error&&!visible.length} emptyLabel="No Flash picks in this window." onRetry={reload}/>
    {groups.map((group) => <section key={group.id}><h2 className="text-2xl font-semibold">{FLASH_LABEL[group.id]}</h2><ul className="mt-3 grid gap-3 fold:grid-cols-2">{group.picks.map((pick)=><li key={`${pick.fixtureId}-${pick.rule}`}><FlashCard pick={pick}/></li>)}</ul></section>)}
  </div>;
}
