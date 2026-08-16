# Betagree

Live soccer consensus for [betagree.com](https://betagree.com).

Today’s fixtures, three live desks (market, form, attack), ranked by agreement. Decimal odds. No invented tipsters.

## GitHub Pages + your Hostinger domain

The site is a static app. The live board runs in the browser against ESPN. Hook the repo to Pages, then point **betagree.com** at GitHub.

### 1. Turn on Pages

Repo → **Settings → Pages**

- Source: **GitHub Actions**
- Custom domain: `betagree.com`
- Tick **Enforce HTTPS** once the certificate is ready (can take up to an hour after DNS)

A push to `main` deploys automatically.

### 2. DNS at Hostinger

In **Hostinger → Domains → betagree.com → DNS / Nameservers**:

**A records** for the root (`@`):

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | 3600 |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |

**CNAME** for www:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `www` | `riddimbossy-prog.github.io` |

Delete any Hostinger parking / default A records that still point at Hostinger.

Wait until `dig betagree.com` shows those GitHub IPs, then reload Pages → custom domain.

## Local

```bash
git clone https://github.com/riddimbossy-prog/betagree.git
cd betagree
npm install
npm run dev
```

## Stack

React 19 · TypeScript · Vite · TanStack Start (SPA) · Tailwind v4

## Responsible use

Betagree is research, not a sportsbook. 18+ / 21+ where betting is legal. [ncpgambling.org](https://www.ncpgambling.org)
