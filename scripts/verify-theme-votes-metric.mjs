// Production-browser regression test. Every remote request is fulfilled locally or aborted.
// Usage: STAMIO_PLAYWRIGHT_PATH=<existing playwright installation> npm run test:theme-votes-metric -- <reference export> <current export>
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import ts from "typescript";

const require = createRequire(import.meta.url);
const themeDefinitions = [
  { slug: "politique", label: "Politique" },
  { slug: "economie", label: "Économie" },
  { slug: "societe", label: "Société" },
  { slug: "sport", label: "Sport" }
];
const themeColors = ["#4D7CFE", "#E0A526", "#00C896", "#9B5CFF"];
const circumference = 2 * Math.PI * 48;

const helperModule = { exports: {} };
const helperSource = ts.transpileModule(readFileSync("lib/aggregatedVotes.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
Function("exports", "require", helperSource)(helperModule.exports, (specifier) => {
  if (specifier === "./product") return { THEMES: themeDefinitions };
  throw new Error(`Unexpected helper import: ${specifier}`);
});
for (const counts of [[0, 0, 0, 0], [1, 0, 0, 0], [2, 2, 2, 2], [4, 2, 1, 1], [8, 2, 0, 0]]) {
  const polls = counts.map((totalVotes, index) => ({ theme: themeDefinitions[index].slug, totalVotes }));
  const actual = helperModule.exports.aggregateVotesByTheme(polls);
  assert.deepEqual(actual.map((item) => item.theme), themeDefinitions.map((item) => item.slug));
  assert.deepEqual(actual.map((item) => item.votes), counts);
  assert.equal(actual.reduce((sum, item) => sum + item.votes, 0), counts.reduce((sum, count) => sum + count, 0));
}

const { chromium } = require(process.env.STAMIO_PLAYWRIGHT_PATH || "playwright");
const { PNG } = require("pngjs");
const [referenceDir, currentDir] = process.argv.slice(2).map((path) => resolve(path));
assert.ok(referenceDir && currentDir, "Supply both production export directories");
const outputDir = resolve(".expo/theme-donut-evidence");
mkdirSync(outputDir, { recursive: true });
const env = readFileSync(".env", "utf8");
const supabaseUrl = new URL(env.match(/^EXPO_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.STAMIO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"
});
const report = { cases: [], responsive: [], animation: null, bundle: null, errors: [] };

function fixturePolls(counts) {
  return counts.map((count, index) => {
    const suffix = String(index + 1).padStart(12, "0");
    const id = `10000000-0000-4000-8000-${suffix}`;
    return {
      id,
      series_id: `20000000-0000-4000-8000-${suffix}`,
      wave_number: 1,
      poll_series: { slug: `fixture-${themeDefinitions[index].slug}` },
      question: `Question ${themeDefinitions[index].label}`,
      description: `Description ${themeDefinitions[index].label}`,
      status: "open",
      theme: themeDefinitions[index].slug,
      featured: false,
      show_in_results: false,
      archived: false,
      created_at: "2026-09-01T10:00:00Z",
      closes_at: "2027-09-30T20:00:00Z",
      poll_resources: [],
      choices: [0, 1].map((choiceIndex) => ({
        id: `30000000-0000-4000-${8000 + index}-${String(choiceIndex + 1).padStart(12, "0")}`,
        poll_id: id,
        label: choiceIndex === 0 ? "Oui" : "Non",
        position: choiceIndex
      })),
      fixtureTotal: count
    };
  });
}

async function openFixture(directory, width, counts, reducedMotion = "reduce") {
  const context = await browser.newContext({
    viewport: { width, height: width < 760 ? 1500 : 900 },
    reducedMotion,
    deviceScaleFactor: 1,
    timezoneId: "Europe/Paris",
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.clock.install({ time: new Date("2026-09-08T12:00:00Z") });
  const polls = fixturePolls(counts);
  const state = { page, context, calls: [], blocked: [] };
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.fixtureColorFrames = [];
    const observer = new MutationObserver(() => {
      const element = [...document.querySelectorAll("div")].find((node) => node.children.length === 0 && node.textContent === "Votes en cours");
      if (!element) return;
      const color = getComputedStyle(element).color;
      const frames = window.fixtureColorFrames;
      if (frames.at(-1)?.color !== color) frames.push({ color, at: performance.now() });
    });
    observer.observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ["style"] });
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4178") {
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      let path = resolve(directory, relative);
      assert.ok(path.startsWith(directory), "Local fixture path escaped export");
      if (!existsSync(path) || !statSync(path).isFile()) path = join(directory, "index.html");
      const contentType = ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" })[extname(path)] || "application/octet-stream";
      return route.fulfill({ body: readFileSync(path), contentType });
    }
    if (url.hostname !== supabaseUrl.hostname) {
      state.blocked.push(url.origin);
      return route.abort();
    }
    const name = url.pathname.split("/").pop();
    state.calls.push(name);
    let body = [];
    if (name === "polls") body = polls.map(({ fixtureTotal, ...poll }) => poll);
    else if (name === "get-results") {
      const { poll_id } = route.request().postDataJSON();
      const poll = polls.find((item) => item.id === poll_id);
      assert.ok(poll, `Unknown poll ${poll_id}`);
      body = { results: [
        { choice_id: poll.choices[0].id, label: "Oui", votes: poll.fixtureTotal },
        { choice_id: poll.choices[1].id, label: "Non", votes: 0 }
      ] };
    } else if (name === "user") return route.fulfill({ status: 401, json: { message: "fixture anonymous" } });
    else if (name === "admin_get_status") body = false;
    return route.fulfill({ json: body });
  });
  await page.goto("http://127.0.0.1:4178/themes");
  await page.getByText("Choisissez un sujet, puis donnez votre avis", { exact: true }).waitFor();
  await page.locator('svg[viewBox="0 0 108 108"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (reducedMotion === "reduce") {
    await page.waitForTimeout(1200);
    await page.clock.pauseAt(new Date("2026-09-08T12:00:10Z"));
  } else await page.waitForTimeout(1800);
  return state;
}

async function getMetrics(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[viewBox="0 0 108 108"]');
    const ring = svg.parentElement;
    const wrap = ring.parentElement;
    const hero = wrap.parentElement;
    const pageGrid = hero.parentElement;
    const heading = hero.children[0];
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const construction = [...document.querySelectorAll("div")].find((node) => node.children.length === 0 && node.textContent === "Votes en cours");
    const segments = [...svg.querySelectorAll('circle[id^="theme-vote-segment-"]')].map((circle) => {
      const dash = (circle.getAttribute("stroke-dasharray") || "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
      return {
        theme: circle.id.replace("theme-vote-segment-", ""),
        color: circle.getAttribute("stroke"),
        length: dash[0],
        remainder: dash[1],
        offset: Number(circle.getAttribute("stroke-dashoffset")),
        strokeWidth: Number(circle.getAttribute("stroke-width")),
        linecap: circle.getAttribute("stroke-linecap"),
        transform: circle.getAttribute("transform")
      };
    });
    return {
      svg: rect(svg), ring: rect(ring), wrap: rect(wrap), hero: rect(hero), heading: rect(heading), pageGrid: rect(pageGrid),
      viewBox: svg.getAttribute("viewBox"), segments,
      construction: construction ? rect(construction) : null,
      constructionText: construction?.textContent || null,
      pageHeight: document.documentElement.scrollHeight
    };
  });
}

function expectedPositive(counts) {
  return counts.map((votes, index) => ({ theme: themeDefinitions[index].slug, color: themeColors[index], votes })).filter((item) => item.votes > 0);
}

async function verifyCase(state, counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const metrics = await getMetrics(state.page);
  const visible = expectedPositive(counts);
  assert.equal(Boolean(metrics.construction), total < 10);
  assert.deepEqual(metrics.segments.map((item) => item.theme), visible.map((item) => item.theme));
  assert.deepEqual(metrics.segments.map((item) => item.color?.toUpperCase()), visible.map((item) => item.color));
  assert.ok(metrics.segments.every((item) => item.strokeWidth === 8 && item.linecap === "butt" && item.transform === "rotate(-90 54 54)"));
  if (total > 0) {
    const lengths = metrics.segments.map((item) => item.length);
    assert.ok(Math.abs(lengths.reduce((sum, length) => sum + length, 0) - circumference) < 1e-9);
    lengths.forEach((length, index) => assert.ok(Math.abs(length / circumference - visible[index].votes / total) < 1e-12));
    metrics.segments.forEach((segment, index) => {
      const prior = lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
      assert.ok(Math.abs(segment.offset + prior) < 1e-9);
    });
  } else {
    assert.equal(metrics.segments.length, 0);
  }
  const metricAx = await state.page.locator('svg[viewBox="0 0 108 108"]').locator("../..").ariaSnapshot();
  if (total < 10) {
    assert.match(metricAx, /Votes en cours/);
    assert.doesNotMatch(metricAx, new RegExp(`(^|\\D)${total}(\\D|$)|votes agrégés|vote agrégé`, "i"));
    assert.equal(metrics.constructionText, "Votes en cours");
  } else {
    assert.match(metricAx, new RegExp(`${total} votes agrégés`, "i"));
    assert.doesNotMatch(metricAx, /Votes en cours/);
  }
  return { total, counts, metrics, accessibility: metricAx, calls: state.calls };
}

function bundleSizes(directory) {
  const files = readdirSync(join(directory, "_expo/static/js/web"));
  const sizes = files.map((name) => {
    const bytes = readFileSync(join(directory, "_expo/static/js/web", name));
    return { name, raw: bytes.length, gzip: gzipSync(bytes).length };
  });
  return {
    raw: sizes.reduce((sum, item) => sum + item.raw, 0),
    gzip: sizes.reduce((sum, item) => sum + item.gzip, 0),
    requests: files.length
  };
}

function countChangedPixelsOutsideDonut(referencePng, currentPng, donutRect) {
  const a = PNG.sync.read(referencePng);
  const b = PNG.sync.read(currentPng);
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  const left = Math.floor(donutRect.x - 2), right = Math.ceil(donutRect.x + donutRect.width + 2);
  const top = Math.floor(donutRect.y - 2), bottom = Math.ceil(donutRect.y + donutRect.height + 2);
  let outside = 0;
  let inside = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const i = (y * a.width + x) * 4;
    if (!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) {
      if (x >= left && x <= right && y >= top && y <= bottom) inside += 1;
      else outside += 1;
    }
  }
  return { inside, outside };
}

try {
  const cases = [
    [0, 0, 0, 0],
    [1, 0, 0, 0],
    [2, 2, 2, 2],
    [4, 2, 1, 1],
    [5, 2, 1, 1],
    [4, 3, 2, 1],
    [5, 3, 2, 1],
    [8, 2, 0, 0]
  ];
  for (const counts of cases) {
    const state = await openFixture(currentDir, 393, counts);
    report.cases.push(await verifyCase(state, counts));
    assert.deepEqual(state.blocked, []);
    await state.context.close();
  }

  for (const width of [375, 393, 430, 1280]) {
    const counts = [4, 3, 2, 1];
    const reference = await openFixture(referenceDir, width, counts);
    const current = await openFixture(currentDir, width, counts);
    const referenceMetrics = await getMetrics(reference.page);
    const currentCase = await verifyCase(current, counts);
    const currentMetrics = currentCase.metrics;
    for (const key of ["svg", "ring", "wrap", "hero", "heading", "pageGrid", "pageHeight", "viewBox"]) {
      assert.deepEqual(currentMetrics[key], referenceMetrics[key], `${key} layout parity at ${width}px`);
    }
    assert.deepEqual(current.calls, reference.calls, `No new network request at ${width}px`);
    const referencePng = await reference.page.screenshot({ path: join(outputDir, `${width}-reference-10.png`), fullPage: true });
    const currentPng = await current.page.screenshot({ path: join(outputDir, `${width}-current-10.png`), fullPage: true });
    const raster = countChangedPixelsOutsideDonut(referencePng, currentPng, currentMetrics.svg);
    assert.equal(raster.outside, 0, `Only the donut ring changes at ${width}px`);
    assert.ok(raster.inside > 0, `The segmented ring changes pixels at ${width}px`);

    const hidden = await openFixture(currentDir, width, [4, 2, 1, 1]);
    const hiddenCase = await verifyCase(hidden, [4, 2, 1, 1]);
    for (const key of ["svg", "ring", "wrap", "hero", "heading", "pageGrid", "pageHeight", "viewBox"]) {
      assert.deepEqual(hiddenCase.metrics[key], currentMetrics[key], `${key} stable below threshold at ${width}px`);
    }
    assert.ok(hiddenCase.metrics.construction.width <= 64 && hiddenCase.metrics.construction.height <= 32);
    await hidden.page.screenshot({ path: join(outputDir, `${width}-current-8.png`), fullPage: true });
    report.responsive.push({ width, reference: referenceMetrics, current: currentMetrics, hidden: hiddenCase.metrics, raster, requests: current.calls });
    await reference.context.close();
    await current.context.close();
    await hidden.context.close();
  }

  const animated = await openFixture(currentDir, 393, [4, 2, 1, 1], "no-preference");
  const background = "rgb(8, 11, 16)";
  const bright = "rgb(251, 252, 255)";
  const samples = [];
  for (let index = 0; index < 20; index++) {
    samples.push(await animated.page.getByText("Votes en cours", { exact: true }).evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { color: style.color, opacity: style.opacity, transform: style.transform, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    await animated.page.waitForTimeout(40);
  }
  const frames = await animated.page.evaluate(() => window.fixtureColorFrames);
  assert.equal(frames[0].color, background);
  const brightIndex = frames.findIndex((frame) => frame.color === bright);
  const returnIndex = frames.findIndex((frame, index) => index > brightIndex && frame.color === background);
  assert.ok(brightIndex > 0 && returnIndex > brightIndex);
  const riseMs = frames[brightIndex].at - frames[0].at;
  const cycleMs = frames[returnIndex].at - frames[0].at;
  assert.ok(riseMs >= 700 && riseMs <= 900, `Pulse rise is approximately 800ms: ${riseMs}`);
  assert.ok(cycleMs >= 1500 && cycleMs <= 1700, `Pulse cycle is approximately 1600ms: ${cycleMs}`);
  assert.ok(new Set(frames.map((frame) => frame.color)).size > 20);
  for (const sample of samples) {
    assert.equal(sample.opacity, "1");
    assert.equal(sample.transform, "none");
    assert.deepEqual({ ...sample, color: null }, { ...samples[0], color: null });
  }
  await animated.page.emulateMedia({ reducedMotion: "reduce" });
  await animated.page.waitForTimeout(150);
  const reducedStart = await animated.page.getByText("Votes en cours", { exact: true }).evaluate((element) => getComputedStyle(element).color);
  await animated.page.waitForTimeout(1800);
  const reducedEnd = await animated.page.getByText("Votes en cours", { exact: true }).evaluate((element) => getComputedStyle(element).color);
  assert.equal(reducedStart, bright);
  assert.equal(reducedEnd, bright);
  report.animation = { background, bright, riseMs, cycleMs, distinctColors: new Set(frames.map((frame) => frame.color)).size, samples, reducedStart, reducedEnd };
  await animated.context.close();

  assert.deepEqual(report.errors, []);
  report.bundle = { before: bundleSizes(referenceDir), after: bundleSizes(currentDir) };
  report.bundle.delta = {
    raw: report.bundle.after.raw - report.bundle.before.raw,
    gzip: report.bundle.after.gzip - report.bundle.before.gzip
  };
  console.log("PASS aggregate theme donut: thresholds, proportions, geometry, raster, animation, accessibility, and network parity");
} finally {
  writeFileSync(join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(outputDir, "final.diff"), execFileSync("git", ["diff", "--no-ext-diff"], { encoding: "utf8" }));
  await browser.close();
}
