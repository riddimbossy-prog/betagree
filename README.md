# BetAgree — Personal Betting Memory

A mock-betting platform that lets users select virtual tips, remembers which team/market combinations worked, recalls those patterns when the team plays again, and supports team or market blacklists. There is no real-money betting.

## Data source

The server reads football fixtures and odds directly from SportyBet FactsCenter. It tries Ghana first and falls back across supported SportyBet regions when an edge is unavailable. No SportyBet credentials are stored in the client.

## Run

```bash
npm install
npm run dev     # frontend on 8080
PORT=8787 npm start # API/static server; use 8080 after npm run build
```

User memory is private to the browser in this MVP. A production database/auth layer can replace the storage adapter without changing the product model.
