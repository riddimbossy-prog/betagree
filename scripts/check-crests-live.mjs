import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

async function stats() {
  for (let i = 0; i < 6; i++) {
    try {
      await page.waitForTimeout(800);
      return await page.evaluate(() => {
        const plates = [...document.querySelectorAll(".crest-plate")];
        const rows = plates.map((el) => {
          const img = el.querySelector("img");
          return {
            title: el.getAttribute("title") || "",
            src: img?.currentSrc || img?.src || "",
            w: img?.naturalWidth || 0,
            hasImg: Boolean(img),
          };
        });
        const good = rows.filter((r) => r.hasImg && r.w > 0);
        const heraldry = rows.filter((r) => !r.hasImg || r.w === 0);
        const kind = (s) =>
          /sofascore/.test(s) ? "sofa" : /\/crests\//.test(s) ? "local" : /espncdn/.test(s) ? "espn" : /wiki/.test(s) ? "wiki" : "other";
        const counts = { sofa: 0, local: 0, espn: 0, wiki: 0, other: 0 };
        for (const r of good) counts[kind(r.src)] += 1;
        return {
          total: rows.length,
          good: good.length,
          heraldry: heraldry.length,
          heraldryNames: heraldry.map((r) => r.title),
          counts,
          samples: good.slice(0, 15).map((r) => `${r.title} [${kind(r.src)} ${r.w}px] ${r.src}`),
        };
      });
    } catch {
      /* hmr / nav */
    }
  }
  return { error: "evaluate failed" };
}

const pages = [
  ["home", "http://127.0.0.1:8080/"],
  ["fixtures", "http://127.0.0.1:8080/fixtures"],
  ["streaks", "http://127.0.0.1:8080/streaks"],
];
const out = {};
for (const [key, url] of pages) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5500);
  out[key] = await stats();
}

await page.goto("http://127.0.0.1:8080/streaks", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(5500);
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(1500);
try {
  await page.screenshot({ path: "/workspace/screenshots/verify-streaks-scroll.png", timeout: 8000 });
} catch {}
out.problem = await page.evaluate(() => {
  const keys = ["sabadell", "besiktas", "hilal", "nassr", "monza", "brugge", "sonder", "young boys", "cienciano", "alverca", "riyadh", "aegir", "khor", "hacken", "fener"];
  return [...document.querySelectorAll(".crest-plate")]
    .map((el) => {
      const img = el.querySelector("img");
      return { title: el.getAttribute("title") || "", src: img?.src || null, w: img?.naturalWidth || 0 };
    })
    .filter((r) => keys.some((k) => r.title.toLowerCase().includes(k)));
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
