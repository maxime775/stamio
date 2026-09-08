// Production-browser regression test. No request reaches Supabase (including votes).
// Usage: STAMIO_PLAYWRIGHT_PATH=<existing playwright installation> npm run test:public-results -- <reference export> <current export>
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import ts from "typescript";

const require = createRequire(import.meta.url);
const helperModule = { exports: {} };
Function("exports", ts.transpileModule(readFileSync("lib/publicResults.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText)(helperModule.exports);
for (const total of [0, 1, 9, 10, 11]) {
  assert.equal(helperModule.exports.canShowPublicResults(total), total >= 10);
  assert.equal(helperModule.exports.getTotalVotes([{ votes: total }]), total);
}

const { chromium } = require(process.env.STAMIO_PLAYWRIGHT_PATH || "playwright");
const { PNG } = require("pngjs");
const [referenceDir, currentDir] = process.argv.slice(2).map((path) => resolve(path));
assert.ok(referenceDir && currentDir, "Supply both production export directories");
const outputDir = resolve(".expo/results-gate-evidence");
mkdirSync(outputDir, { recursive: true });
const pollId = "11111111-1111-4111-8111-111111111111";
const seriesId = "22222222-2222-4222-8222-222222222222";
const user = { id: "33333333-3333-4333-8333-333333333333", email: "fixture@example.test", email_confirmed_at: "2026-09-01T10:00:00Z", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} };
const choices = ["Oui", "Non"].map((label, i) => ({ id: `44444444-4444-4444-8444-44444444444${i}`, poll_id: pollId, label, position: i }));
const poll = { id: pollId, series_id: seriesId, wave_number: 3, poll_series: { slug: "fixture-seuil" }, question: "Faut-il faire évoluer cette mesure ?", description: "Cette question permet de comparer les différents points de vue et leurs conséquences.", status: "open", theme: "societe", created_at: "2026-09-09T10:00:00Z", closes_at: "2027-09-30T20:00:00Z", choices, poll_resources: [] };
const timestamps = Array.from({ length: 10 }, (_, i) => new Date(Date.UTC(2026, 8, 9, 10) + i * (4 * 86400000 / 9)).toISOString());
const results = (total) => choices.map((choice, i) => ({ choice_id: choice.id, label: choice.label, votes: i === 0 ? Math.ceil(total * 0.6) : total - Math.ceil(total * 0.6) }));
const history = (total) => timestamps.slice(0, Math.min(total, 10)).flatMap((captured_at, i) => results(i + 1).map((row) => ({ ...row, captured_at, percentage: Number((row.votes * 100 / (i + 1)).toFixed(2)) })));
const env = readFileSync(".env", "utf8");
const supabaseUrl = new URL(env.match(/^EXPO_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]);
const browser = await chromium.launch({ headless: true, executablePath: process.env.STAMIO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const report = { responsive: [], cases: [], errors: [], transition: null, animation: null, bundle: null };

async function openFixture(directory, width, total, motion = "reduce", authenticated = false) {
  const context = await browser.newContext({ viewport: { width, height: width < 760 ? 1800 : 1100 }, reducedMotion: motion, deviceScaleFactor: 1, timezoneId: "Europe/Paris", hasTouch: width < 760, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const state = { total, calls: [], navigations: 0, page, context };
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.clock.install({ time: new Date("2026-09-13T10:00:00Z") });
  await page.addInitScript(() => {
    window.fixtureInitialColors = {};
    window.fixtureColorFrames = { "Votes en cours": [], "Signal en construction": [] };
    const observer = new MutationObserver(() => {
      for (const label of ["Votes en cours", "Signal en construction"]) {
        const el = [...document.querySelectorAll("div")].find((node) => node.children.length === 0 && node.textContent === label);
        if (!el) continue;
        const color = getComputedStyle(el).color;
        window.fixtureInitialColors[label] ??= color;
        const frames = window.fixtureColorFrames[label];
        if (frames.at(-1)?.color !== color) frames.push({ color, at: performance.now() });
      }
    });
    observer.observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ["style"] });
  });
  if (authenticated) await page.addInitScript(({ key, user }) => {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp: 2100000000, role: "authenticated" }))}.fixture`;
    localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: "fixture-only", expires_at: 2100000000, expires_in: 360000, token_type: "bearer", user }));
  }, { key: `sb-${supabaseUrl.hostname.split(".")[0]}-auth-token`, user });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4177") {
      if (route.request().isNavigationRequest()) state.navigations += 1;
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      let path = resolve(directory, relative);
      assert.ok(path.startsWith(directory), "Local fixture path escaped export");
      if (!existsSync(path) || !statSync(path).isFile()) path = join(directory, "index.html");
      const contentType = ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" })[extname(path)] || "application/octet-stream";
      return route.fulfill({ body: readFileSync(path), contentType });
    }
    // Every remote request is fulfilled locally or aborted. Never route.continue().
    if (url.hostname !== supabaseUrl.hostname) return route.abort();
    const name = url.pathname.split("/").pop();
    state.calls.push(name);
    let body = [];
    if (name === "resolve_public_question") body = [{ poll_id: pollId, series_id: seriesId, series_slug: "fixture-seuil", wave_number: 3, route_kind: "question" }];
    else if (name === "polls") body = poll;
    else if (name === "get-results") {
      assert.deepEqual(route.request().postDataJSON(), { poll_id: pollId });
      body = { results: results(state.total) };
    } else if (name === "get-results-history") {
      assert.deepEqual(route.request().postDataJSON(), { poll_id: pollId });
      body = { history: history(state.total) };
    }
    else if (name === "user") body = user;
    else if (name === "profiles") body = { id: user.id, username: "Fixture", passkey_required_at: null };
    else if (name === "user_poll_participations") body = null;
    else if (name === "admin_get_status") body = false;
    else if (name === "authorize-vote") {
      assert.deepEqual(route.request().postDataJSON(), { poll_id: pollId });
      body = { status: "authorized", permit: "fixture-permit", expires_at: "2026-09-13T11:00:00Z" };
    } else if (name === "submit-ballot") {
      assert.equal(route.request().headers().authorization, undefined);
      assert.equal(route.request().postDataJSON().permit, "fixture-permit");
      state.total += 1;
      body = { status: "accepted" };
    } else if (name === "finalize-vote") body = { status: "finalized" };
    return route.fulfill({ json: body });
  });
  await page.goto("http://127.0.0.1:4177/question/fixture-seuil");
  await page.getByText("Résultats dans le temps", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  if (motion === "reduce" && !authenticated) await page.clock.pauseAt(new Date("2026-09-13T10:00:10Z"));
  state.initialCalls = [...state.calls];
  return state;
}

async function metrics(page) {
  return page.evaluate(() => {
    const donut = document.querySelector('svg[viewBox="0 0 112 112"]');
    const donutFrame = donut.parentElement;
    const donutContent = donutFrame.parentElement;
    const donutCard = donutContent.parentElement;
    const legend = donutContent.children[1];
    const chart = [...document.querySelectorAll("svg")].find((svg) => svg.querySelector("text")?.textContent === "0%");
    const rect = (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const text = (label) => [...document.querySelectorAll("div")].find((el) => el.textContent === label && el.children.length === 0);
    const legendRows = [...legend.children].map((row) => {
      const [swatch, label, percentage] = row.children;
      return {
        row: rect(row),
        swatch: rect(swatch),
        swatchColor: getComputedStyle(swatch).backgroundColor,
        label: rect(label),
        labelText: label.textContent,
        labelOpacity: getComputedStyle(label).opacity,
        percentage: rect(percentage),
        percentageText: percentage.textContent,
        percentageOpacity: getComputedStyle(percentage).opacity,
        percentageAriaHidden: percentage.getAttribute("aria-hidden") === "true"
      };
    });
    return {
      donut: rect(donut), chart: rect(chart), donutFrame: rect(donutFrame),
      donutContent: rect(donutContent), donutCard: rect(donutCard), legend: rect(legend), legendRows,
      chartCard: rect(chart.parentElement.parentElement.parentElement),
      context: rect(document.querySelector("#poll-context")),
      discussion: rect(document.querySelector("#poll-discussion")),
      segments: donut.querySelectorAll("g circle").length, paths: chart.querySelectorAll("path").length,
      points: chart.querySelectorAll("circle").length, grid: [...chart.querySelectorAll("line")].map((line) => line.outerHTML),
      dates: [...chart.querySelectorAll("text")].slice(3).map((el) => el.textContent),
      donutMessage: text("Votes en cours") ? rect(text("Votes en cours")) : null,
      chartMessage: text("Signal en construction") ? rect(text("Signal en construction")) : null
    };
  });
}

async function checkState(state, total) {
  const m = await metrics(state.page);
  const hidden = total < 10;
  assert.equal(Boolean(m.donutMessage), hidden);
  assert.equal(Boolean(m.chartMessage), hidden);
  assert.equal(m.segments > 0, !hidden);
  assert.equal(m.paths > 0, !hidden);
  assert.equal(m.points > 0, !hidden);
  assert.equal(m.grid.length, 5);
  const ax = await state.page.locator('svg[viewBox="0 0 112 112"]').locator("../..").ariaSnapshot();
  if (hidden) {
    assert.match(ax, /Votes en cours/);
    for (const label of choices.map((choice) => choice.label)) assert.match(ax, new RegExp(label));
    assert.doesNotMatch(ax, /%|pour cent|\d+ votes/);
    assert.deepEqual(m.legendRows.map((row) => row.labelText), choices.map((choice) => choice.label));
    assert.ok(m.legendRows.every((row) => row.labelOpacity === "1"));
    assert.ok(m.legendRows.every((row) => row.swatch.width === 12 && row.swatch.height === 2 && row.swatchColor !== "rgba(0, 0, 0, 0)"));
    assert.ok(m.legendRows.every((row) => row.percentageOpacity === "0" && row.percentageAriaHidden));
  }
  else {
    assert.match(ax, /60%|64%|pour cent/);
    assert.ok(m.legendRows.every((row) => row.percentageOpacity === "1" && !row.percentageAriaHidden));
  }
  if (hidden) {
    const { donut: d, donutMessage: dm, chart: c, chartMessage: cm } = m;
    assert.ok(Math.abs(dm.x + dm.width / 2 - d.x - 56) < 1);
    assert.ok(Math.abs(dm.y + dm.height / 2 - d.y - 56) <= 1);
    assert.ok(Math.hypot(dm.width / 2, dm.height / 2) < 38, "Text fits inside 76px hole");
    assert.ok(Math.abs(cm.x + cm.width / 2 - (c.x + 42 + (c.width - 60) / 2)) < 1);
    const plotHeight = c.height - 40;
    assert.ok(Math.abs(cm.y + cm.height / 2 - (c.y + 8 + plotHeight * 0.375)) < 1);
    for (const fraction of [0, .25, .5, .75, 1]) assert.ok(cm.y > c.y + 8 + plotHeight * fraction || cm.y + cm.height < c.y + 8 + plotHeight * fraction);
    await state.page.mouse.move(c.x + 42, c.y + 8);
    const after = await metrics(state.page);
    assert.equal(after.grid.length, 5);
    assert.equal(after.points, 0);
    assert.equal(await state.page.locator("[role=tooltip]").count(), 0);
  }
  return m;
}

function getLegendGeometry(metrics) {
  return {
    donut: metrics.donut,
    donutFrame: metrics.donutFrame,
    donutContent: metrics.donutContent,
    donutCard: metrics.donutCard,
    legend: metrics.legend,
    rows: metrics.legendRows.map((row) => ({
      row: row.row,
      swatch: row.swatch,
      label: row.label,
      percentageSlot: row.percentage
    }))
  };
}

try {
  for (const width of [375, 393, 430, 1280]) {
    const baseline = await openFixture(referenceDir, width, 10);
    const before = await metrics(baseline.page);
    const referencePng = await baseline.page.screenshot({ path: join(outputDir, `${width}-reference-10.png`), fullPage: true });
    const current = await openFixture(currentDir, width, 10);
    const after = await checkState(current, 10);
    assert.deepEqual(after, before, `Geometry and plotted elements parity at ${width}`);
    const currentPng = await current.page.screenshot({ path: join(outputDir, `${width}-current-10.png`), fullPage: true });
    const a = PNG.sync.read(referencePng), b = PNG.sync.read(currentPng);
    assert.equal(a.width, b.width); assert.equal(a.height, b.height);
    let changedPixels = 0;
    for (let i = 0; i < a.data.length; i += 4) if (!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) changedPixels++;
    assert.equal(changedPixels, 0, `Raster parity at ${width}`);
    assert.deepEqual([...new Set(current.initialCalls)].sort(), [...new Set(baseline.initialCalls)].sort(), "No additional network endpoint");
    const hidden = await openFixture(currentDir, width, 9);
    const hiddenMetrics = await checkState(hidden, 9);
    for (const key of ["donut", "donutFrame", "chart", "chartCard", "context", "discussion", "grid"]) assert.deepEqual(hiddenMetrics[key], after[key], `${key} stable below threshold at ${width}`);
    assert.deepEqual(getLegendGeometry(hiddenMetrics), getLegendGeometry(after), `Donut and legend geometry stable from 9 to 10 votes at ${width}`);
    await hidden.page.screenshot({ path: join(outputDir, `${width}-current-9.png`), fullPage: true });
    report.responsive.push({ width, changedPixels, normal: after, hidden: hiddenMetrics, requests: current.calls });
    if (width === 393) {
      for (const fixture of [baseline, current]) {
        await fixture.page.clock.resume();
        const chart = (await metrics(fixture.page)).chart;
        await fixture.page.touchscreen.tap(chart.x + 48, chart.y + 9);
        await fixture.page.waitForTimeout(100);
        assert.equal((await metrics(fixture.page)).grid.length, 6, "Touch selects the historical curve at 10 votes on reference and current");
      }
      report.touchAtTen = true;
    }
    console.log(`PASS ${width}px: raster parity and stable geometry below threshold`);
    await baseline.context.close(); await current.context.close(); await hidden.context.close();
  }
  for (const total of [0, 1, 9, 10, 11]) {
    const state = await openFixture(currentDir, 393, total);
    report.cases.push({ total, metrics: await checkState(state, total) });
    console.log(`PASS ${total} votes`);
    await state.context.close();
  }
  const transition = await openFixture(currentDir, 393, 9, "reduce", true);
  const beforeVote = await checkState(transition, 9);
  await transition.page.getByText("Votre réponse", { exact: true }).locator("../../..").getByText("Oui", { exact: true }).click();
  await transition.page.getByText("Valider mon vote", { exact: true }).click();
  await transition.page.getByText("Comptabiliser mon vote", { exact: true }).click();
  await transition.page.getByText("Merci d’avoir exprimé votre point de vue, votre participation a bien été comptabilisée.", { exact: true }).waitFor();
  await transition.page.getByLabel("Fermer", { exact: true }).click();
  await transition.page.getByLabel("Fermer", { exact: true }).waitFor({ state: "hidden" });
  const revealed = await checkState(transition, 10);
  assert.equal(transition.navigations, 1, "No page reload after vote");
  for (const key of ["donut", "chart", "context", "discussion"]) assert.deepEqual(revealed[key], beforeVote[key], `${key} stable during accepted vote`);
  assert.deepEqual(getLegendGeometry(revealed), getLegendGeometry(beforeVote), "Legend labels, markers and reserved percentage slots stay fixed during 9 to 10 transition");
  assert.ok(revealed.legendRows.every((row) => row.percentageOpacity === "1" && /%$/.test(row.percentageText)));
  await transition.page.screenshot({ path: join(outputDir, "393-transition-10.png"), fullPage: true });
  assert.match(revealed.dates[0], /09/);
  assert.equal(transition.calls.filter((name) => name === "get-results-history").length, 2);
  const c = revealed.chart;
  await transition.page.mouse.move(c.x + 42, c.y + 8);
  await transition.page.waitForTimeout(100);
  assert.equal((await metrics(transition.page)).grid.length, 6, "Interactive selection restored");
  assert.match(await transition.page.locator("body").innerText(), /09 sept.*12:00/);
  await transition.page.mouse.move(0, 0);
  await transition.page.waitForTimeout(350);
  await transition.page.touchscreen.tap(c.x + 48, c.y + 9);
  await transition.page.waitForTimeout(100);
  const touchLines = (await metrics(transition.page)).grid.length;
  const referenceTouch = await openFixture(referenceDir, 393, 9, "reduce", true);
  await referenceTouch.page.getByText("Votre réponse", { exact: true }).locator("../../..").getByText("Oui", { exact: true }).click();
  await referenceTouch.page.getByText("Valider mon vote", { exact: true }).click();
  await referenceTouch.page.getByText("Comptabiliser mon vote", { exact: true }).click();
  await referenceTouch.page.getByText("Merci d’avoir exprimé votre point de vue, votre participation a bien été comptabilisée.", { exact: true }).waitFor();
  await referenceTouch.page.getByLabel("Fermer", { exact: true }).click();
  await referenceTouch.page.getByLabel("Fermer", { exact: true }).waitFor({ state: "hidden" });
  const referenceChart = (await metrics(referenceTouch.page)).chart;
  await referenceTouch.page.mouse.move(referenceChart.x + 42, referenceChart.y + 8);
  await referenceTouch.page.waitForTimeout(100);
  await referenceTouch.page.mouse.move(0, 0);
  await referenceTouch.page.waitForTimeout(350);
  await referenceTouch.page.touchscreen.tap(referenceChart.x + 48, referenceChart.y + 9);
  await referenceTouch.page.waitForTimeout(100);
  const referenceTouchLines = (await metrics(referenceTouch.page)).grid.length;
  assert.equal(touchLines, referenceTouchLines, "Web touch behavior must match HEAD");
  await referenceTouch.context.close();
  transition.total = 9;
  await transition.page.getByText("Signal en construction", { exact: true }).waitFor();
  await checkState(transition, 9);
  report.transition = { accepted: true, withoutReload: true, navigations: transition.navigations, firstDate: timestamps[0], lastDate: timestamps[9], resetToNine: true, mouse: true, touchAfterMouseMatchesReference: true, calls: transition.calls };
  await transition.context.close();

  const animated = await openFixture(currentDir, 393, 9, "no-preference");
  const backgroundColor = "rgb(8, 11, 16)";
  const brightColor = "rgb(251, 252, 255)";
  const initialColors = await animated.page.evaluate(() => window.fixtureInitialColors);
  assert.deepEqual(Object.values(initialColors), [backgroundColor, backgroundColor]);
  const pageGradients = await animated.page.getByText("Signal en construction", { exact: true }).evaluate((el) => {
    const gradients = [];
    for (let current = el.parentElement; current; current = current.parentElement) {
      const backgroundImage = getComputedStyle(current).backgroundImage;
      if (backgroundImage !== "none") gradients.push(backgroundImage);
    }
    return gradients;
  });
  assert.ok(pageGradients.some((gradient) => gradient.includes(backgroundColor) && gradient.includes("rgb(10, 14, 20)")), "The construction text sits on the page gradient whose endpoint is palette.canvas");
  const samples = [];
  const donutSamples = [];
  for (let i = 0; i < 20; i++) {
    samples.push(await animated.page.getByText("Signal en construction", { exact: true }).evaluate((el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { color: s.color, opacity: s.opacity, transform: s.transform, x: r.x, y: r.y, width: r.width, height: r.height };
    }));
    donutSamples.push(await animated.page.getByText("Votes en cours", { exact: true }).evaluate((el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { color: s.color, opacity: s.opacity, transform: s.transform, x: r.x, y: r.y, width: r.width, height: r.height };
    }));
    await animated.page.waitForTimeout(40);
  }
  const colorFrames = await animated.page.evaluate(() => window.fixtureColorFrames);
  const pulseCadence = {};
  for (const [label, sequence] of [["Signal en construction", samples], ["Votes en cours", donutSamples]]) {
    assert.ok(new Set(sequence.map((s) => s.color)).size > 10);
    for (const sample of sequence) assert.deepEqual({ ...sample, color: null }, { ...sequence[0], color: null });
    assert.equal(sequence[0].opacity, "1"); assert.equal(sequence[0].transform, "none");
    const frames = colorFrames[label];
    assert.ok(new Set(frames.map((frame) => frame.color)).size > 20);
    assert.equal(frames[0].color, backgroundColor);
    const brightIndex = frames.findIndex((frame) => frame.color === brightColor);
    assert.ok(brightIndex > 0, `${label} reaches the bright endpoint`);
    const backgroundReturnIndex = frames.findIndex((frame, index) => index > brightIndex && frame.color === backgroundColor);
    assert.ok(backgroundReturnIndex > brightIndex, `${label} returns to the background endpoint`);
    const riseMs = frames[brightIndex].at - frames[0].at;
    const cycleMs = frames[backgroundReturnIndex].at - frames[0].at;
    assert.ok(riseMs >= 700 && riseMs <= 900, `${label} rise cadence is approximately 800ms: ${riseMs}ms`);
    assert.ok(cycleMs >= 1500 && cycleMs <= 1700, `${label} full cadence is approximately 1600ms: ${cycleMs}ms`);
    pulseCadence[label] = { riseMs, cycleMs, distinctColors: new Set(frames.map((frame) => frame.color)).size };
  }
  await animated.page.waitForFunction(({ label, color }) => getComputedStyle([...document.querySelectorAll("div")].find((el) => el.children.length === 0 && el.textContent === label)).color === color, { label: "Signal en construction", color: backgroundColor });
  await animated.page.screenshot({ path: join(outputDir, "393-current-9-background.png"), fullPage: true });
  await animated.page.waitForFunction(({ label, color }) => getComputedStyle([...document.querySelectorAll("div")].find((el) => el.children.length === 0 && el.textContent === label)).color === color, { label: "Signal en construction", color: brightColor });
  await animated.page.screenshot({ path: join(outputDir, "393-current-9-bright.png"), fullPage: true });
  await animated.page.emulateMedia({ reducedMotion: "reduce" });
  await animated.page.waitForTimeout(150);
  const reducedColors = await animated.page.getByText("Signal en construction", { exact: true }).evaluate((el) => getComputedStyle(el).color);
  assert.equal(reducedColors, brightColor);
  await animated.page.waitForTimeout(1800);
  assert.equal(await animated.page.getByText("Votes en cours", { exact: true }).evaluate((el) => getComputedStyle(el).color), reducedColors);
  report.animation = { backgroundColor, brightColor, pageGradients, initialColors, pulseCadence, samples, donutSamples, reducedColors };
  await animated.context.close();
  assert.deepEqual(report.errors, []);
  function bundleSizes(dir) {
    const files = readdirSync(join(dir, "_expo/static/js/web"));
    const sizes = files.map((name) => { const bytes = readFileSync(join(dir, "_expo/static/js/web", name)); return { name, raw: bytes.length, gzip: gzipSync(bytes).length }; });
    return { raw: sizes.reduce((sum, s) => sum + s.raw, 0), gzip: sizes.reduce((sum, s) => sum + s.gzip, 0), entry: sizes.find((s) => s.name.startsWith("entry-")) };
  }
  report.bundle = { before: bundleSizes(referenceDir), after: bundleSizes(currentDir) };
  console.log("PASS public results: 0/1/9/10/11, 9→10→9, full history, responsive/raster, animation, accessibility, network parity");
} finally {
  if (!report.animation) for (const context of browser.contexts()) for (const page of context.pages()) {
    writeFileSync(join(outputDir, "failure-dom.html"), await page.content());
    await page.screenshot({ path: join(outputDir, "failure.png") });
  }
  writeFileSync(join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(outputDir, "final.diff"), execFileSync("git", ["diff", "--no-ext-diff"], { encoding: "utf8" }));
  await browser.close();
}
