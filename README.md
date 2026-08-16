# Linework

Live soccer consensus desk. It reads **today’s fixtures**, compares **three live desks**, and ranks the picks they agree on.

No baked cards. No invented tipsters. No Vercel.

## What it does

Every 45 seconds the site pulls the live ESPN soccer board (kick-offs, scores, DraftKings prices) plus the last 21 days of settled results.

| Desk | Source |
| --- | --- |
| **Market** | Shortest 1X2 / total on the posted number |
| **Form** | Points from each side’s last five finished matches |
| **Attack** | Recent goals for/against → match winner, total, BTTS |

A consensus pick is the side that shows up on **at least two** desks.

## Run it locally

```bash
git clone https://github.com/riddimbossy-prog/linework.git
cd linework
npm install
npm run dev
```

Then open `http://localhost:8080`.

## Put it on your own domain

This is a Node app (live scores and prices are fetched on the server). GitHub Pages / a static host will not work. You need any cheap VPS (Hetzner, DigitalOcean, Contabo, a home box, etc.).

### 1. Point the domain

At your DNS provider, create:

| Type | Name | Value |
| --- | --- | --- |
| **A** | `@` (and `www` if you want it) | your server’s public IP |

Wait until the record resolves (`dig yourdomain.com`).

### 2. Install on the server

```bash
# on the server
git clone https://github.com/riddimbossy-prog/linework.git
cd linework
npm install
npm run build
```

### 3. Run it (Docker — easiest)

Copy `.env.example` to `.env` and set your domain:

```bash
cp .env.example .env
# edit .env → DOMAIN=yourdomain.com
docker compose up -d --build
```

Caddy sits in front, gets a free HTTPS certificate, and serves the site on your domain.

### 4. Or run it without Docker

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

Then put Caddy or nginx in front:

```
# /etc/caddy/Caddyfile
yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```

Keep it up with systemd or `pm2 start npm --name linework -- start`.

## Commands

```bash
npm run dev        # local development
npm run build      # production build → .output/
npm start          # serve the production build
npm run typecheck
```

No API key. The board is public ESPN data.

## Stack

React 19 · TypeScript · Vite · TanStack Start · Tailwind v4 · Node 22

## Responsible use

Linework is research, not a sportsbook. It does not place bets. 18+ / 21+ where betting is legal. [ncpgambling.org](https://www.ncpgambling.org)
