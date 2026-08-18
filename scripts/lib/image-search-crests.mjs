#!/usr/bin/env node
/**
 * Image-search a football crest.
 * Query matches a Google Images search: "{club} football club crest".
 * Google Images is captcha-walled from this network, so we hit Bing's
 * image index (same public web images).
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SKIP =
  /jersey|kit|scarf|stadium|arena|player|shirt|ticket|news|banner|wallpaper|wordmark|signature|autograph|flag_of|map_of/i;

function decode(url) {
  return url.replace(/&/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
}

function extractMurls(html) {
  const out = [];
  const entity = "&" + "quot;";
  const marker = "murl" + entity + ":" + entity;
  let from = 0;
  while (from < html.length) {
    const i = html.indexOf(marker, from);
    if (i < 0) break;
    const start = i + marker.length;
    const end = html.indexOf(entity, start);
    if (end < 0) break;
    const url = decode(html.slice(start, end));
    if (url.startsWith("http") && !out.includes(url)) out.push(url);
    from = end + entity.length;
  }
  return out;
}

export async function searchCrestImages(name) {
  const q = `${name} football club crest logo`;
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=0&count=35&mmasync=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  return extractMurls(html).filter((u) => !SKIP.test(u));
}

export async function webImageBadge(name) {
  try {
    const urls = await searchCrestImages(name);
    const prefer = urls.filter((u) =>
      /\.png(\?|$)/i.test(u) || /wikipedia|wikimedia|transfermarkt|sofascore|thesportsdb|brandlogos|seeklogo/i.test(u),
    );
    return prefer[0] ?? urls[0] ?? null;
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const name = process.argv.slice(2).join(" ") || "Ajax";
  const urls = await searchCrestImages(name);
  console.log(JSON.stringify({ name, n: urls.length, urls: urls.slice(0, 8) }, null, 2));
}
