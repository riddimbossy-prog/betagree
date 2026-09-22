#!/usr/bin/env node
/**
 * Load https://betagree.com in a real browser and report whether the
 * live board rendered (fixtures / consensus / empty-slate copy).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] || "https://betagree.com/";
const outPng = process.argv[3] || "/workspace/screenshots/betagree-live.png";
const timeoutMs = Number(process.env.BROWSER_SMOKE_TIMEOUT_MS || 45000);

mkdirSync("/workspace/screenshots", { recursive: true });

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));

  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
  const status = resp?.status() ?? 0;
  await page.waitForTimeout(2500);

  const title = await page.title();
  const body = (await page.locator("body").innerText().catch(() => "")).trim();
  const lastModified = resp?.headers()["last-modified"] ?? "";
  const hasBoard =
    /Sporting|consensus|fixtures|banker|streak|form board|today/i.test(body) &&
    body.length > 80;
  const broken =
    /Something went wrong|Could not reach the live board|Failed to load module/i.test(body);

  await page.screenshot({ path: outPng, fullPage: false });

  const spaFallback = status === 404 && hasBoard && !broken;
  const result = {
    ok: (status === 200 || spaFallback) && hasBoard && !broken && pageErrors.length === 0,
    url,
    status,
    title,
    lastModified,
    bodyChars: body.length,
    hasBoard,
    broken,
    preview: body.slice(0, 400),
    consoleErrors: consoleErrors.slice(0, 8),
    pageErrors,
    screenshot: outPng,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
} finally {
  await browser.close();
}
