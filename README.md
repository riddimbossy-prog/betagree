# Linework

Live soccer consensus desk. It reads **today’s fixtures**, compares **three live desks**, and ranks the picks they agree on.

No baked cards. No invented tipsters.

## What it does

Every 45 seconds the site pulls the live ESPN soccer board (kick-offs, scores, DraftKings prices) plus the last 21 days of settled results.

Three desks post independently:

| Desk | Source |
| --- | --- |
| **Market** | Shortest 1X2 / total on the posted number |
| **Form** | Points from each side’s last five finished matches |
| **Attack** | Recent goals for/against → match winner, total, BTTS |

A consensus pick is the side that shows up on **at least two** desks. Accuracy is walk-forward: form never sees the game being graded.

## Run it

```bash
git clone https://github.com/riddimbossy-prog/linework.git
cd linework
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:8080`).

```bash
npm run build      # production build (Vercel)
npm run typecheck
```

No API key. The board is public ESPN data.

## Deploy

Connect the GitHub repo to [Vercel](https://vercel.com). Framework preset: Vite. Build command `npm run build`. The Vite config already emits the Vercel preset.

## Stack

React 19 · TypeScript · Vite · TanStack Start · Tailwind v4

## Responsible use

Linework is research, not a sportsbook. It does not place bets. 18+ / 21+ where betting is legal. [ncpgambling.org](https://www.ncpgambling.org)
