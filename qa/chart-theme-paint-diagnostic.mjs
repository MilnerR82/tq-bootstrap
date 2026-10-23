import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, firefox, webkit } from 'playwright';

const root = process.cwd();
const base = 'http://127.0.0.1:5198';
const chartURL = 'https://cdn.jsdelivr.net/npm/chart.js@4.3.2/dist/chart.umd.js';
const bytes = Buffer.from(await (await fetch(chartURL)).arrayBuffer());
const expectedSRI = 'sha384-eI7PSr3L1XLISH8JdDII5YN/njoSsxfbrkCTnJrzXt+ENP5MOVBxD+l6sEG4zoLp';
if ('sha384-' + createHash('sha384').update(bytes).digest('base64') !== expectedSRI) throw Error('SRI mismatch');
const report = { started: new Date().toISOString(), method: 'Read-only diagnostic instrumentation of original observer/native Chart draw/resize methods and actual canvas fillText calls; no product source changes or test assertion relaxations.', cases: [] };
const names = (process.env.TQ_DIAG_BROWSERS || 'chromium,firefox,webkit').split(',');
const forceDraw = process.env.TQ_DIAG_FORCE_DRAW === '1';
const negativeProbe = process.env.TQ_DIAG_NEGATIVE_PROBE === '1';
report.inMemoryDrawFix = forceDraw;
report.inMemoryNegativeProbe = negativeProbe;
for (const name of names) {
  const browser = await ({ chromium, firefox, webkit }[name]).launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    if (url === chartURL) return route.fulfill({ body: bytes, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    return route.abort();
  });
  await context.addInitScript(() => {
    const trace = window.__chartDiagnostic = { events: [], paint: [] };
    const paintParser = document.createElement('canvas').getContext('2d');
    trace.normalize = paint => { paintParser.fillStyle = paint; return paintParser.fillStyle; };
    const log = (type, detail = {}) => trace.events.push({ type, at: performance.now(), theme: document.documentElement?.dataset.bsTheme, ...detail });
    const nativeObserver = window.MutationObserver;
    window.MutationObserver = class extends nativeObserver {
      constructor(callback) {
        const callbackSource = callback.toString();
        super((mutations, observer) => {
          if (mutations.some(mutation => mutation.attributeName === 'data-bs-theme')) log('observer callback', { callbackSource, themes: mutations.map(mutation => ({ attribute: mutation.attributeName, oldValue: mutation.oldValue })) });
          return callback(mutations, observer);
        });
      }
    };
    const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (this.canvas.id === 'myChart') trace.paint.push({ at: performance.now(), theme: document.documentElement.dataset.bsTheme, text: String(text), fillStyle: this.fillStyle, alpha: this.globalAlpha, args });
      return nativeFillText.call(this, text, ...args);
    };
    trace.install = () => {
      for (const name of ['update', 'draw', 'render', 'resize', '_resize']) {
        const original = Chart.prototype[name];
        Chart.prototype[name] = function (...args) {
          log(name + ' before', { args, labels: Object.fromEntries(Object.entries(this.scales || {}).map(([axis, scale]) => [axis, scale._labelItems?.length ?? null])) });
          const result = original.apply(this, args);
          log(name + ' after', { labels: Object.fromEntries(Object.entries(this.scales || {}).map(([axis, scale]) => [axis, scale._labelItems?.length ?? null])) });
          return result;
        };
      }
      new nativeObserver(mutations => log('diagnostic attribute observer', { count: mutations.length })).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
    };
    trace.snapshot = () => {
      const chart = Chart.getChart(document.querySelector('#myChart'));
      return {
        at: performance.now(), theme: document.documentElement.dataset.bsTheme,
        colour: getComputedStyle(chart.canvas).color, normalizedColour: trace.normalize(getComputedStyle(chart.canvas).color), size: [chart.width, chart.height],
        geometry: {
          chartArea: { ...chart.chartArea }, size: [chart.width, chart.height],
          points: chart.getDatasetMeta(0).data.map(point => point.getProps(['x', 'y'], true)),
          axes: Object.fromEntries(Object.entries(chart.scales).map(([axis, scale]) => [axis, {
            min: scale.min, max: scale.max, left: scale.left, top: scale.top,
            right: scale.right, bottom: scale.bottom, width: scale.width, height: scale.height,
            labels: scale.ticks.map(tick => tick.label)
          }]))
        },
        attached: chart.attached, animation: Chart.animator?.running?.(chart),
        axes: Object.fromEntries(Object.entries(chart.scales).map(([axis, scale]) => [axis, {
          display: scale.options.display, ticksDisplay: scale.options.ticks.display,
          labelItems: scale._labelItems?.map(item => ({ label: item.label, color: item.options.color })) ?? null,
          tickLabels: scale.ticks.map(tick => tick.label), tickOption: String(scale.options.ticks.color)
        }]))
      };
    };
  });
  const page = await context.newPage();
  for (let round = 0; round < 3; round++) for (const theme of ['light', 'dark']) for (const direction of ['', '-rtl']) {
    const item = { browser: name, round, theme, direction, snapshots: [] };
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${base}/docs/5.3/examples/dashboard${direction}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.Chart?.getChart(document.querySelector('#myChart')));
    await page.evaluate(async theme => {
      window.__chartDiagnostic.install();
      document.documentElement.dataset.bsTheme = theme;
      const chart = Chart.getChart(document.querySelector('#myChart'));
      chart.stop(); chart.update('none');
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      chart.stop(); chart.update('none');
      const position = chart.getDatasetMeta(0).data[0].getProps(['x', 'y'], true);
      chart.tooltip.setActiveElements([{ datasetIndex: 0, index: 0 }], position);
      chart.update('none');
    }, theme);
    await page.waitForFunction(() => {
      const chart = Chart.getChart(document.querySelector('#myChart'));
      return chart.tooltip.opacity === 1 && Object.values(chart.scales).every(scale => scale._labelItems?.length);
    }, undefined, { timeout: 5000 });
    item.snapshots.push(await page.evaluate(() => window.__chartDiagnostic.snapshot()));
    item.changeAt = await page.evaluate(async ({ theme, forceDraw }) => {
      if (forceDraw) {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        new MutationObserver(() => chart.draw()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
      }
      window.__chartDiagnostic.changeAt = performance.now();
      document.documentElement.dataset.bsTheme = theme === 'light' ? 'dark' : 'light';
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 180));
      return window.__chartDiagnostic.changeAt;
    }, { theme, forceDraw });
    try {
      await page.waitForFunction(() => {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        return Object.values(chart.scales).every(scale => scale._labelItems?.length);
      }, undefined, { timeout: 5000 });
      item.privateCacheReady = true;
    } catch (error) { item.privateCacheReady = false; item.error = error.message; }
    item.snapshots.push(await page.evaluate(() => window.__chartDiagnostic.snapshot()));
    item.trace = await page.evaluate(() => ({ events: window.__chartDiagnostic.events, paint: window.__chartDiagnostic.paint }));
    const after = item.snapshots.at(-1);
    const labels = Object.values(after.axes).flatMap(axis => axis.tickLabels).map(String);
    const actualPaint = item.trace.paint.filter(paint => paint.at > item.changeAt);
    item.axisPaint = labels.map(label => actualPaint.find(paint => paint.text === label) || { text: label, missing: true });
    item.measuredPaintReady = item.axisPaint.every(paint => !paint.missing && paint.fillStyle === after.normalizedColour && paint.alpha === 1);
    item.geometryPreserved = JSON.stringify(item.snapshots[0].geometry) === JSON.stringify(after.geometry);
    item.actualPaintCount = actualPaint.length;
    if (negativeProbe) {
      item.negativeProbe = await page.evaluate(() => {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        const expected = window.__chartDiagnostic.normalize(getComputedStyle(chart.canvas).color);
        const wrong = document.documentElement.dataset.bsTheme === 'light' ? '#f1efed' : '#373234';
        const labels = Object.values(chart.scales).flatMap(scale => scale.ticks.map(tick => String(tick.label)));
        const at = performance.now();
        chart.options.scales.x.ticks.color = wrong;
        chart.options.scales.y.ticks.color = wrong;
        chart.update('none'); chart.draw();
        const paints = window.__chartDiagnostic.paint.filter(paint => paint.at >= at);
        const firstAxisPaint = labels.map(label => paints.find(paint => paint.text === label));
        const ready = firstAxisPaint.every(paint => paint && paint.fillStyle === expected && paint.alpha === 1);
        return { expected, wrong, paints, rejected: !ready };
      });
    }
    if (!item.privateCacheReady) {
      const screenshot = await page.locator('#myChart').screenshot();
      item.screenshotSHA256 = createHash('sha256').update(screenshot).digest('hex');
      await fs.writeFile(path.join(root, '.cache', `chart-draw-failure-${name}-${round}-${theme}${direction}.png`), screenshot);
      item.afterScreenshot = await page.evaluate(() => window.__chartDiagnostic.snapshot());
    }
    report.cases.push(item);
    console.log(name, round, theme, direction || 'ltr', item.privateCacheReady ? 'cache-ready' : 'CACHE-TIMEOUT');
  }
  await browser.close();
}
report.finished = new Date().toISOString();
report.summary = { cases: report.cases.length, timeouts: report.cases.filter(item => !item.privateCacheReady).length,
  measuredPaintReady: report.cases.filter(item => item.measuredPaintReady).length,
  geometryPreserved: report.cases.filter(item => item.geometryPreserved).length,
  negativeProbesRejected: report.cases.filter(item => item.negativeProbe?.rejected).length };
await fs.writeFile(path.join(root, `.cache/chart-draw-diagnostic${forceDraw ? '-forced-draw' : ''}${negativeProbe ? '-negative' : ''}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(report.summary);
