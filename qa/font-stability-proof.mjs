import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium, firefox, webkit} from 'playwright';
import {waitForFontGeometry} from './font-stability.mjs';
import {canonicalSvgContent} from './colour-substitution-proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
const harness = await fs.readFile(path.join(root, 'qa/examples-colour-parity.mjs'), 'utf8');
const properties = JSON.parse(harness.match(/const properties=(\[[^\n]+\]);/)[1].replaceAll("'", '"'));
if (properties.length !== 100 || properties.some(property => typeof property !== 'string')) throw Error('Original 100-property comparison list changed');
const css = await fs.readFile(path.join(root, 'dist/css/bootstrap.css'), 'utf8');
const sourceFiles = ['qa/font-stability.mjs', 'qa/font-stability-proof.mjs', 'qa/examples-colour-parity.mjs', 'qa/colour-substitution-proof.mjs', 'dist/css/bootstrap.css'];
const fingerprints = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
const report = {suite: 'Generic font settling and strict comparison boundary proof', started: new Date().toISOString(), method: 'Use the same 100 non-colour properties, geometry and SVG paint canonicalisation as the original example audit. Warm actual text/font descriptors without changing DOM/styles, require 750ms continuously stable metrics, and prove that unchanged/paint-only content remains equal while real font-size and family changes remain unequal. Continuously changing fonts must time out rather than yield an accepted sample.', sourceAtStart: await fingerprints(), checks: []};

async function snapshot(page) {
  return page.evaluate(({properties, svgPaintSource}) => {
    const paint = value => value.replace(/rgba?\([^)]*\)|#[a-f\d]{3,8}/gi, '<paint>');
    const svgPaint = (0, eval)('(' + svgPaintSource + ')');
    return [...document.body.querySelectorAll('*')].flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      const build = pseudo => {
        const style = getComputedStyle(element, pseudo);
        return {index, tag: element.tagName, id: element.id, pseudo, rect: pseudo ? undefined : [rect.x, rect.y, rect.width, rect.height].map(number => Number(number.toFixed(3))), styles: properties.map(property => /^(?:box|text)-shadow$/.test(property) ? paint(style.getPropertyValue(property)) : property === 'content' ? svgPaint(style.getPropertyValue(property)) : style.getPropertyValue(property))};
      };
      const values = [build(null)];
      for (const pseudo of ['::before', '::after']) if (!['none', 'normal', ''].includes(getComputedStyle(element, pseudo).content)) values.push(build(pseudo));
      return values;
    });
  }, {properties, svgPaintSource: canonicalSvgContent.toString()});
}

for (const browserName of ['chromium', 'firefox', 'webkit']) {
  const browser = await ({chromium, firefox, webkit}[browserName]).launch();
  const page = await browser.newPage({viewport: {width: 390, height: 768}, reducedMotion: 'reduce'});
  await page.setContent('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Font stability proof</title><style>' + css + '</style></head><body><p><em id="probe">هذا السطر يحوي نص مائل.</em></p><blockquote><cite>عنوان المصدر</cite></blockquote></body></html>');
  const originalDOM = await page.locator('html').evaluate(element => element.outerHTML);
  const warm = await waitForFontGeometry(page);
  const before = await snapshot(page);
  const fast = await waitForFontGeometry(page);
  const unchanged = await snapshot(page);
  report.checks.push({browser: browserName, state: 'initial-prewarm', ...warm, pass: warm.warmed && warm.quietMs === 750 && await page.locator('html').evaluate(element => element.outerHTML) === originalDOM});
  report.checks.push({browser: browserName, state: 'unchanged-fast-path', ...fast, pass: !fast.warmed && JSON.stringify(before) === JSON.stringify(unchanged)});
  await page.locator('#probe').evaluate(element => {element.style.color = '#e31b23';});
  const paint = await waitForFontGeometry(page), painted = await snapshot(page);
  report.checks.push({browser: browserName, state: 'paint-only-fast-path', ...paint, pass: !paint.warmed && JSON.stringify(before) === JSON.stringify(painted)});
  for (const change of ['font-size', 'font-family']) {
    const baseline = await snapshot(page);
    await page.locator('#probe').evaluate((element, change) => {element.style.setProperty(change, change === 'font-size' ? '24px' : 'monospace');}, change);
    const settled = await waitForFontGeometry(page), changed = await snapshot(page);
    report.checks.push({browser: browserName, state: 'real-' + change + '-rejected', ...settled, beforeSHA256: sha(JSON.stringify(baseline)), afterSHA256: sha(JSON.stringify(changed)), pass: settled.warmed && JSON.stringify(baseline) !== JSON.stringify(changed)});
  }
  await page.evaluate(() => {let tick = 0; window.__fontProofInterval = setInterval(() => {document.getElementById('probe').style.fontSize = (++tick % 2 ? 21 : 23) + 'px';}, 60); document.getElementById('probe').style.fontSize = '21px';});
  let error;
  try {await waitForFontGeometry(page, {quietMs: 750, timeoutMs: 1400});} catch (caught) {error = caught.message;}
  await page.evaluate(() => clearInterval(window.__fontProofInterval));
  report.checks.push({browser: browserName, state: 'unstable-font-rejected', error, pass: Boolean(error?.includes('Font/geometry did not remain stable'))});
  await browser.close();
}

report.sourceAtEnd = await fingerprints();
report.summary = {checks: report.checks.length, passed: report.checks.filter(check => check.pass).length, failed: report.checks.filter(check => !check.pass).length, properties: properties.length, sourcesFrozen: JSON.stringify(report.sourceAtStart) === JSON.stringify(report.sourceAtEnd)};
report.finished = new Date().toISOString();
await fs.writeFile(path.join(root, 'qa/results/font-stability.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.failed || !report.summary.sourcesFrozen) process.exitCode = 1;
