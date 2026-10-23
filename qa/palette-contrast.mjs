import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium, firefox, webkit } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.TQ_BASE_URL || 'http://127.0.0.1:5198';
const origin = new URL(base).origin;
const stylesheet = base + '/dist/css/bootstrap.css';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const families = {
  blue: '#2f4370', indigo: '#091135', purple: '#6c0162', pink: '#f32a7c', red: '#e31b23',
  orange: '#ff4904', yellow: '#ff4904', green: '#00766c', teal: '#00a89b', cyan: '#00a89b',
  black: '#373234', white: '#ffffff', gray: '#696567', 'gray-dark': '#373234'
};
const roles = {
  primary: '#e31b23', secondary: '#696567', success: '#00766c', info: '#00a89b',
  warning: '#ff4904', danger: '#8a0008', light: '#f1efed', dark: '#091135'
};
const report = {
  suite: 'Expanded TQ palette: native Bootstrap CSS paint and semantic contrast',
  started: new Date().toISOString(), expectedFamilies: families, expectedRoles: roles,
  method: 'Capture genuine viewport display-list paint (SHA recorded) before fixture measurements, without changing the page. Render original Bootstrap class/element patterns in an isolated audit fixture using the actual served full framework CSS. Exercise real pointer hover, keyboard focus-visible and held-pointer active states. Read browser-resolved paint and alpha-composite actual ancestor backgrounds, including uniform inset table paint. Test supported outline surfaces through original bg-white/bg-dark utilities. Decode actual native feedback/checked SVG paint. No product files or Bootstrap runtime behaviour are changed.',
  limitations: [
    'This is targeted semantic palette evidence, not a complete WCAG 2.2 AA conformance statement.',
    'The fixture validates the actual framework CSS and native component interfaces at1440px, rather than claiming to audit arbitrary future content or all published documentation pages.',
    'Unsupported outline/body combinations are measured and retained separately as documented context limitations. They are never counted as passing contrast checks.',
    'Primary, secondary, success, danger and dark outline bases use white; info, warning and light bases use the native Outback Indigo bg-dark surface. Default dark mode uses emphasis tints; unmodified bright-teal and orange bases are inappropriate small-text paint on ordinary charcoal.',
    'Solid-button checks require text4.5:1. They do not assert every low-contrast decorative border independently needs3:1. Supported outline control identification requires3:1 through its actual composited fill or border against the immediate exterior; both measurements and the winning cue are retained. Essential SVG glyphs are separately measured against3:1.',
    'The yellow family intentionally aliases TQ orange; green/teal/cyan use supplied teal-family aliases. Original Sass/CSS interfaces remain, while these are documented brand colour adaptations.',
    'Default link/code tests use ordinary body surfaces in both modes. Arbitrary semantic text utilities, opacity variants and background combinations are not asserted to conform.'
  ], checks: [], findings: [], documentedContextLimits: [], blockedExternalResources: []
};

async function walk(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else result.push(file);
  }
  return result;
}
async function fingerprints() {
  const files = [path.join(root, 'qa/palette-contrast.mjs'), path.join(root, 'qa/example-contrast.mjs')];
  for (const directory of ['dist/css', 'src/scss']) files.push(...await walk(path.join(root, directory)));
  for (const file of ['_functions.scss', '_variables.scss', '_variables-dark.scss', '_maps.scss', 'mixins/_buttons.scss'])
    files.push(path.join(root, 'upstream/bootstrap/scss', file));
  return Object.fromEntries(await Promise.all(files.sort().map(async file => [
    path.relative(root, file).replaceAll('\\', '/'), hash(await fs.readFile(file))
  ])));
}
const luminance = channels => channels.slice(0, 3).map(v => v / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
};
function measured(info, paint, threshold, expectedForeground) {
  const contrast = ratio(paint.foreground, paint.background);
  const expectedPaintMatches = !expectedForeground || paint.rawChannels.slice(0, 3).join(',') === expectedForeground.join(',');
  const pass = paint.visible && contrast >= threshold && expectedPaintMatches;
  const row = { ...info, ...paint, threshold, contrast, expectedForeground: expectedForeground || null, expectedPaintMatches, pass };
  report.checks.push(row);
  if (!pass) report.findings.push(row);
}
function invariant(info, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  const row = { ...info, actual, expected, pass };
  report.checks.push(row);
  if (!pass) report.findings.push(row);
}

function fixture(theme) {
  const rows = Object.keys(roles).map(role => `
    <section class="mb-3">
      <button type="button" id="solid-${role}" class="btn btn-${role}">${role} action</button>
      <div id="outline-surface-${role}" class="p-3"><button type="button" id="outline-${role}" class="btn btn-outline-${role}">${role} outline</button></div>
      <p id="emphasis-${role}" class="text-${role}-emphasis">${role} emphasis</p>
      <div id="alert-${role}" class="alert alert-${role}" role="alert">${role} status <a id="alert-link-${role}" href="#" class="alert-link">More information</a></div>
      <table class="table table-${role}"><thead><tr><th id="table-heading-${role}" scope="col">${role} heading</th></tr></thead><tbody><tr><td id="table-cell-${role}">${role} cell</td></tr></tbody></table>
    </section>`).join('');
  const validation = ['valid', 'invalid'].map(state => `<div class="mb-3"><label for="feedback-${state}">${state} input</label><input id="feedback-${state}" class="form-control is-${state}" value="Example"><div id="feedback-text-${state}" class="${state}-feedback">${state} feedback</div></div>` +
    ['checkbox', 'radio'].map(type => `<div class="form-check"><input id="checked-${type}-${state}" type="${type}" name="${type}-${state}" class="form-check-input is-${state}" checked><label class="form-check-label" for="checked-${type}-${state}">${state} ${type}</label></div>`).join('')).join('');
  return `<!doctype html><html lang="en" data-bs-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TQ native palette audit fixture</title><link id="framework" rel="stylesheet" href="${stylesheet}"></head><body><main class="container py-3"><h1>Native palette audit</h1><p><a id="default-link" href="#">Default body link</a></p><p><code id="inline-code">example()</code></p>${rows}${validation}</main></body></html>`;
}
async function install(page) {
  await page.evaluate(() => {
    const parser = document.createElement('canvas').getContext('2d');
    function colour(value) {
      parser.fillStyle = '#010203'; parser.fillStyle = value; const normalized = parser.fillStyle;
      parser.fillStyle = '#fefdfc'; parser.fillStyle = value;
      if (normalized !== parser.fillStyle) throw Error('Invalid browser paint: ' + value);
      if (/^#[a-f\d]{6}$/i.test(normalized)) return [...normalized.slice(1).match(/../g).map(v => parseInt(v, 16)), 1];
      const values = normalized.match(/[\d.]+/g)?.map(Number);
      if (!values || values.length < 3) throw Error('Unrecognized paint: ' + normalized);
      return [...values.slice(0, 3), values[3] ?? 1];
    }
    function over(a, b) {
      const alpha = a[3] + b[3] * (1 - a[3]);
      return alpha ? [...a.slice(0, 3).map((v, i) => (v * a[3] + b[i] * b[3] * (1 - a[3])) / alpha), alpha] : [0, 0, 0, 0];
    }
    function surface(element) {
      const ancestors = [];
      for (let current = element; current; current = current.parentElement) ancestors.unshift(current);
      return ancestors.reduce((background, current) => {
        const style = getComputedStyle(current);
        let paint = over(colour(style.backgroundColor), background);
        if (style.boxShadow !== 'none' && style.boxShadow.includes('inset') && style.boxShadow.includes('9999px')) {
          const colors = style.boxShadow.match(/rgba?\([^)]*\)|#[a-f\d]{3,8}/gi) || [];
          if (colors.length !== 1) throw Error('Unreviewed table inset paint: ' + style.boxShadow);
          paint = over(colour(colors[0]), paint);
        }
        return paint;
      }, [255, 255, 255, 1]);
    }
    function sample(selector, { property = 'color', paint, outside = false } = {}) {
      const element = document.querySelector(selector);
      if (!element) throw Error('Missing native fixture target: ' + selector);
      const style = getComputedStyle(element), rawForeground = paint ?? style.getPropertyValue(property);
      const background = surface(outside ? element.parentElement : element);
      const rawChannels = colour(rawForeground);
      let opacity = 1;
      for (let current = element; current; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
      const effective = [...rawChannels.slice(0, 3), rawChannels[3] * opacity];
      return { selector, property, rawForeground, rawChannels, foreground: over(effective, background), background,
        visible: Boolean(element.getClientRects().length) && style.visibility !== 'hidden' && style.display !== 'none' };
    }
    window.__palette = { colour, sample };
  });
}
const sample = (page, selector, options) => page.evaluate(({ selector, options }) => window.__palette.sample(selector, options), { selector, options });
async function state(page, selector, value) {
  await page.mouse.move(1430, 990);
  await page.evaluate(() => document.activeElement?.blur());
  if (value === 'hover' || value === 'active') await page.locator(selector).hover();
  if (value === 'focus') { await page.keyboard.press('Tab'); await page.locator(selector).focus(); }
  if (value === 'active') await page.mouse.down();
  await page.waitForTimeout(180);
  const actual = await page.locator(selector).evaluate(element => ({
    hover: element.matches(':hover'), focus: element.matches(':focus'), focusVisible: element.matches(':focus-visible'), active: element.matches(':active')
  }));
  if (value === 'hover' && !actual.hover || value === 'focus' && (!actual.focus || !actual.focusVisible) || value === 'active' && !actual.active)
    throw Error('Native state not reached: ' + selector + ' ' + value);
  return actual;
}
async function svgPaint(page, selector) {
  return page.locator(selector).evaluate(element => {
    const image = getComputedStyle(element).backgroundImage;
    const raw = image.replace(/^url\(/, '').replace(/\)$/, '').replace(/^["']|["']$/g, '');
    if (!raw.startsWith('data:image/svg+xml,')) throw Error('Missing actual native SVG paint: ' + image);
    const document = new DOMParser().parseFromString(decodeURIComponent(raw.slice(raw.indexOf(',') + 1)), 'image/svg+xml');
    const paints = [...document.querySelectorAll('[fill],[stroke]')].flatMap(node => ['fill', 'stroke'].map(attribute => node.getAttribute(attribute)))
      .filter(value => value && !['none', 'transparent'].includes(value));
    const unique = [...new Set(paints)];
    if (unique.length !== 1) throw Error('Expected one native glyph paint: ' + unique);
    return unique[0];
  });
}

report.assetsAtStart = await fingerprints();
for (const browserName of ['chromium', 'firefox', 'webkit']) {
  const browser = await ({ chromium, firefox, webkit }[browserName]).launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    if (!report.blockedExternalResources.includes(route.request().url())) report.blockedExternalResources.push(route.request().url());
    return route.abort();
  });
  const response = await context.request.get(stylesheet);
  const servedHash = hash(await response.body());
  if (response.status() !== 200 || servedHash !== report.assetsAtStart['dist/css/bootstrap.css'])
    report.findings.push({ browser: browserName, target: 'actual served stylesheet', status: response.status(), servedHash });
  const page = await context.newPage();
  for (const theme of ['light', 'dark']) {
    const info = { browser: browserName, theme, width: 1440, fixture: 'isolated native Bootstrap classes', stylesheet, stylesheetSHA256: servedHash };
    try {
      await page.emulateMedia({ colorScheme: theme });
      await page.setContent(fixture(theme), { waitUntil: 'load' });
      await page.waitForFunction(() => Boolean(document.querySelector('#framework').sheet));
      await page.evaluate(() => document.fonts.ready);
      info.displayListScreenshotSHA256 = hash(await page.screenshot());
      await install(page);
      const expected = await page.evaluate(({ families, roles }) => {
        const style = getComputedStyle(document.documentElement);
        return Object.entries({ ...families, ...roles }).map(([name, paint]) => ({
          name, expected: window.__palette.colour(paint), actual: window.__palette.colour(style.getPropertyValue('--bs-' + name).trim())
        }));
      }, { families, roles });
      for (const value of expected) invariant({ ...info, target: 'family/semantic CSS variable', variable: '--bs-' + value.name }, value.actual, value.expected);
      for (const [property, paint] of [['color', theme === 'light' ? '#373234' : '#f1efed'], ['background-color', theme === 'light' ? '#ffffff' : '#373234']]) {
        const value = await page.evaluate(({ property, paint }) => ({
          actual: window.__palette.colour(getComputedStyle(document.body).getPropertyValue(property)), expected: window.__palette.colour(paint)
        }), { property, paint });
        invariant({ ...info, target: 'ordinary body paint', property }, value.actual, value.expected);
      }
      for (const role of Object.keys(roles)) {
        const unsupported = await sample(page, '#outline-' + role);
        const unsupportedRatio = ratio(unsupported.foreground, unsupported.background);
        if (unsupportedRatio < 4.5) report.documentedContextLimits.push({ ...info, target: 'native outline on ordinary body', role,
          ...unsupported, contrast: unsupportedRatio, requiredTextContrast: 4.5, classification: 'Inappropriate context, excluded from passing test counts',
          supportedSurface: ['info', 'warning', 'light'].includes(role) ? '.bg-dark Outback Indigo' : '.bg-white' });
        const surfaceClass = ['info', 'warning', 'light'].includes(role) ? 'bg-dark' : 'bg-white';
        await page.locator('#outline-surface-' + role).evaluate((element, className) => element.classList.add(className), surfaceClass);
        const surface = await page.locator('#outline-surface-' + role).evaluate(element => getComputedStyle(element).backgroundColor);
        if (surface !== (surfaceClass === 'bg-dark' ? 'rgb(9, 17, 53)' : 'rgb(255, 255, 255)')) throw Error('Incorrect native outline surface: ' + surface);
        for (const kind of ['solid', 'outline']) for (const value of ['rest', 'hover', 'focus', 'active']) {
          const selector = '#' + kind + '-' + role;
          try {
            const actual = await state(page, selector, value);
            const expectedLabel = kind === 'outline' && value === 'rest'
              ? await page.evaluate(paint => window.__palette.colour(paint).slice(0, 3), roles[role])
              : ['info', 'warning', 'light'].includes(role) ? [9, 17, 53] : [255, 255, 255];
            measured({ ...info, target: 'native ' + kind + ' button text', role, state: value, actual,
              context: kind === 'outline' ? surfaceClass : 'native solid fill' }, await sample(page, selector), 4.5, expectedLabel);
            if (kind === 'outline') {
              const border = await sample(page, selector, { property: 'border-top-color', outside: true });
              const fill = await sample(page, selector, { property: 'background-color', outside: true });
              const borderExteriorContrast = ratio(border.foreground, border.background);
              const fillExteriorContrast = ratio(fill.foreground, fill.background);
              const winningCue = fillExteriorContrast > borderExteriorContrast ? 'existing fill' : 'existing border';
              measured({ ...info, target: 'supported outline boundary', role, state: value, actual, context: surfaceClass,
                identificationCriterion: 'At least3:1 through the existing control fill OR border against its actual immediate exterior',
                boundaryEvidence: { border, fill, borderExteriorContrast, fillExteriorContrast, borderFillContrast: ratio(border.foreground, fill.foreground), winningCue } },
                winningCue === 'existing fill' ? fill : border, 3);
            }
          } finally { if (value === 'active') await page.mouse.up(); }
        }
        measured({ ...info, target: 'mode-aware emphasis utility on body', role }, await sample(page, '#emphasis-' + role), 4.5);
        for (const kind of ['alert', 'alert-link', 'table-heading', 'table-cell'])
          measured({ ...info, target: 'native ' + kind + ' text', role }, await sample(page, '#' + kind + '-' + role), 4.5);
      }
      for (const value of ['rest', 'hover', 'focus']) {
        const actual = await state(page, '#default-link', value);
        measured({ ...info, target: 'default body link', state: value, actual }, await sample(page, '#default-link'), 4.5);
      }
      measured({ ...info, target: 'inline code on body' }, await sample(page, '#inline-code'), 4.5);
      for (const validity of ['valid', 'invalid']) {
        const expectedGlyph = await page.evaluate(paint => window.__palette.colour(paint).slice(0, 3), validity === 'valid' ? 'rgb(0,151.2,139.5)' : '#fc1721');
        measured({ ...info, target: 'native feedback SVG', validity }, await sample(page, '#feedback-' + validity,
          { paint: await svgPaint(page, '#feedback-' + validity) }), 3, expectedGlyph);
        measured({ ...info, target: 'native validation feedback text', validity }, await sample(page, '#feedback-text-' + validity), 4.5);
        for (const type of ['checkbox', 'radio']) {
          const selector = '#checked-' + type + '-' + validity;
          const actualBackground = await page.locator(selector).evaluate(element => getComputedStyle(element).backgroundColor);
          if (actualBackground !== (validity === 'valid' ? 'rgb(0, 118, 108)' : 'rgb(138, 0, 8)')) throw Error('Checked semantic background is incorrect: ' + actualBackground);
          measured({ ...info, target: 'native checked semantic glyph', validity, control: type },
            await sample(page, selector, { paint: await svgPaint(page, selector) }), 3, [255, 255, 255]);
        }
      }
    } catch (error) { report.findings.push({ ...info, error: error.message }); }
    console.log(browserName + ': measured native expanded palette ' + theme);
  }
  await browser.close();
}
report.assetsAtEnd = await fingerprints();
const assetsFrozen = JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd);
if (!assetsFrozen) report.findings.push({ target: 'source/assets', error: 'Palette audit inputs changed during measurement' });
report.finished = new Date().toISOString();
const contrastRows = report.checks.filter(row => typeof row.contrast === 'number');
report.summary = {
  browsers: ['chromium', 'firefox', 'webkit'], modes: ['light', 'dark'], checks: report.checks.length,
  passed: report.checks.filter(row => row.pass).length, failed: report.findings.length, findings: report.findings.length,
  contrastChecks: contrastRows.length, expectedPaintChecks: report.checks.length - contrastRows.length,
  documentedInappropriateContexts: report.documentedContextLimits.length,
  minimumTextContrast: Math.min(...contrastRows.filter(row => row.threshold === 4.5).map(row => row.contrast)),
  minimumGraphicalContrast: Math.min(...contrastRows.filter(row => row.threshold === 3).map(row => row.contrast)), assetsFrozen
};
await fs.mkdir(path.join(root, 'qa/results'), { recursive: true });
await fs.writeFile(path.join(root, 'qa/results/palette-contrast.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.findings.length) process.exitCode = 1;
