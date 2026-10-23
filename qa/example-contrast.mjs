import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium, firefox, webkit } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.TQ_BASE_URL || 'http://127.0.0.1:5198';
const origin = new URL(base).origin;
const output = path.join(root, 'qa/results/example-contrast.json');
const browserNames = (process.env.TQ_CONTRAST_BROWSERS || 'chromium,firefox,webkit').split(',');
const chartURL = 'https://cdn.jsdelivr.net/npm/chart.js@4.3.2/dist/chart.umd.js';
const expectedChartSRI = 'sha384-eI7PSr3L1XLISH8JdDII5YN/njoSsxfbrkCTnJrzXt+ENP5MOVBxD+l6sEG4zoLp';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {
  suite: 'Targeted TQ example contrast regression audit',
  started: new Date().toISOString(),
  method: 'Capture a genuine viewport display-list screenshot before each page measurement (SHA recorded) to flush WebKit rendered paint without changing the page. Read actual browser-resolved foreground paint and alpha-composited ancestor surfaces from published pages. Read native Chart.js resolved line/point options, its already-drawn axis label cache and deliberately opened tooltip paint in each initial mode. Test in-place theme changes through drawn tick/line/point paint without calling chart.update from the test harness or requiring an existing native tooltip to persist. Read embedded disclosure SVG stroke, SVG placeholder fills, and decoded generated image SVG paints. Exercise existing checkbox/radio inputs through native checking, original validation classes and the Constraint Validation API, decoding their effective checked SVG paint. Select carousel slides through the original public Bootstrap API, pause rotation in the test harness, and measure captions/controls against the actual underlying slide rect. Retain original source markup, geometry and runtime logic; validation modifiers are applied only to existing controls in the test harness.',
  scope: 'Dashboard chart/selected navigation and light secondary toolbar, core outline-secondary on light and outline-info on dark in rest/hover/keyboard-focus/held-active states, default focus helper/nav shadows, progress/range track and primary fill/thumb paint, native validation feedback SVG paint and checked checkbox/radio glyphs through fallback/native validation selectors, offcanvas secondary navigation states, native dark-navbar Search text/border states in carousel LTR/RTL and offcanvas pages, sidebar toggle SVG rest/hover strokes, cover inactive navigation/rest/hover/focus/footer text, blog metadata in both directions, dropdown danger-item text states, cheatsheet disclosure/carousel slides, documentation ordinary/dark carousel slides and shared inline/data-URI placeholders; both light and dark modes.',
  checks: [],
  findings: [],
  externalDependencies: [],
  blockedExternalResources: [],
  limitations: [
    'Targeted paint regression evidence is not a complete WCAG 2.2 AA audit or conformance claim.',
    'These measurements cover the listed pages/states at 1440px. Geometry preservation and responsive interaction coverage are separate audits.',
    'The original remote Chart.js dependency is fetched once, verified against its pinned SRI, and replayed unchanged for deterministic measurement. Other remote resources are blocked; no offline Chart.js or hosted-search claim is made.',
    'Generated data-URI SVG label and surface paints are read from the actual image source and normalized by the browser canvas colour parser; their opaque surface is additionally verified from a rendered image pixel.',
    'Contrast uses full-precision WCAG relative luminance and composited declared colours, excluding text edge antialiasing.',
    'Core outline control identification requires3:1 through its actual composited existing fill OR border against the immediate exterior. Both ratios, their border/fill relation and the actual winning cue are retained; a contrasting filled control does not require its border separately to contrast against the same outer host.',
    'The user approved expanded TQ hues in native semantic roles. Secondary outline retains its light-surface context; bright-teal info outline is measured on an actual native .bg-dark Outback Indigo utility surface in both modes. The unmodified bright-teal base on white (2.968:1) or ordinary charcoal body (4.241:1) is an explicitly inappropriate small-text combination, not a passing test. Native relatively light base outlines need their documented dark context; default dark-mode outline ink uses native-derived emphasis tints; arbitrary future class combinations are not asserted to conform.',
    'Unfilled progress/range track-versus-body checks assert different paint, with an explicit ratio threshold only above1:1. They do not assert3:1 for a pale track on white. Primary fill/thumb-versus-track is separately required to meet3:1; native utility background variants are separately checked only for non-identical fill/track paint.',
    'Validation focus-shadow checks on form-control, form-select and form-check exercise the original validity modifier classes, assert actual keyboard focus, approved default opaque alpha1 and at least3:1 against the adjacent surface. Default focus helper/navigation shadows are independently measured against3:1. Explicit author alpha overrides remain native configuration choices.'
  ]
};
report.previousAttempts = [];
for (const [file, disposition] of [
  ['example-contrast-initial.json', 'Initial harness missed native parent-button SVG filters and sampled tooltip/axis paint before native animation/draw completion. Revised extraction reads ancestor filters and waits for actual native rendering.'],
  ['example-contrast-tick-regression.json', 'The corrected harness found 180 real dark-mode drawn tick failures: Chart-level paint options did not override native scale defaults. Explicit colour callbacks for the original x/y tick, grid and border paint resolved this product finding without changing chart data, fonts, scale types or dimensions.'],
  ['example-contrast-tooltip-timing.json', 'After the scale paint fix, all 935 sampled paint checks passed, with one harness timeout caused by requiring a synthetic tooltip to remain open across native chart.update. Final verification measures deliberately opened tooltip paint separately in each mode, and verifies live theme changes through drawn tick/line/point paint without asserting unrelated tooltip persistence.'],
  ['example-contrast-pre-sidebar-cover.json', 'The preceding complete targeted suite passed 930 checks. Expanded review additionally identified sidebar disclosure-stroke contrast after charcoal substitution and inherited half-white cover text contrast, plus further mode-aware metadata/menu and native dark-navbar Search paint contexts. The expanded suite measures actual states after separately recorded paint corrections: native neutral-black sidebar stroke retained at .5 alpha; cover text colour alone uses .55 white alpha while CSS opacity, geometry and original classes remain unchanged.'],
  ['example-contrast-pre-core-role.json', 'The expanded standalone paint-context suite passed1,182 checks. Subsequent comparison against native core defaults identified secondary outline on light and info outline on dark, an invisible default dark focus ring, merged progress/range track paint and dark feedback icon paint. The final suite adds actual core states and controls after their semantic Sass colour corrections, preserving native mixins, geometry, icon shapes and interaction logic.'],
  ['example-contrast-pre-expanded-palette.json', 'The preceding source-bound suite passed1,416 checks. The user subsequently chose supplied TQ hues in native semantic roles: success dark teal, info bright teal, warning orange, danger dark red and semantic dark Outback Indigo. The info-outline case intentionally changes to the appropriate native .bg-dark surface in both modes, adding light-mode coverage, while previous applicable thresholds/states remain. The valid feedback SVG expectation changes to the approved10% bright-teal shade; checked validation backgrounds are verified against success/danger roles.']
]) {
  try {
    const previous = await fs.readFile(path.join(root, 'qa/results', file));
    report.previousAttempts.push({ file: 'qa/results/' + file, sha256: sha(previous), disposition });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function files(directory) {
  const all = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) all.push(...await files(file));
    else all.push(file);
  }
  return all.sort();
}

async function fingerprints() {
  const paths = new Set();
  for (const directory of ['dist/css', 'docs/5.3/dist/css', 'docs/5.3/dist/js', 'docs/5.3/assets', 'docs/5.3/examples']) {
    for (const file of await files(path.join(root, directory))) {
      if (/\.(?:css|js|html)$/.test(file)) paths.add(file);
    }
  }
  for (const file of [
    'qa/example-contrast.mjs', 'qa/results/example-colour-substitutions.json',
    'qa/results/docs-colour-substitutions.json', 'src/scss/_tokens.scss',
    'src/scss/_validation-colours.scss', 'src/scss/_validation-focus-colours.scss', 'src/scss/_accessible-colours.scss', 'src/scss/_forced-colours.scss', 'src/scss/tq-bootstrap.scss',
    'docs/5.3/components/carousel/index.html', 'docs/5.3/content/images/index.html',
    'docs/5.3/components/buttons/index.html', 'docs/5.3/utilities/object-fit/index.html',
    'docs/5.3/helpers/focus-ring/index.html', 'docs/5.3/components/navs-tabs/index.html',
    'docs/5.3/components/progress/index.html', 'docs/5.3/forms/range/index.html',
    'docs/5.3/forms/validation/index.html', 'docs/5.3/forms/checks-radios/index.html',
    'dist/js/bootstrap.bundle.min.js'
  ]) paths.add(path.join(root, file));
  return Object.fromEntries(await Promise.all([...paths].sort().map(async file => [
    path.relative(root, file).replaceAll('\\', '/'), sha(await fs.readFile(file))
  ])));
}

const luminance = rgba => rgba.slice(0, 3).map(channel => channel / 255)
  .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
const contrast = (foreground, background) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
};

function add(info, sample, threshold, expectedPaint) {
  const ratio = contrast(sample.foreground, sample.background);
  const paintMatches = !expectedPaint || sample.foreground.slice(0, 3).join(',') === expectedPaint.join(',');
  const pass = ratio >= threshold && paintMatches && sample.visible !== false && sample.tooltipInkAlphaMatches !== false;
  report.checks.push({ ...info, ...sample, threshold, contrast: ratio, expectedPaint: expectedPaint || null, paintMatches, pass });
  if (!pass) report.findings.push({ ...info, ratio, threshold, sample, paintMatches });
}

async function installHelpers(page) {
  await page.evaluate(() => {
    const context = document.createElement('canvas').getContext('2d');
    function colour(value) {
      context.fillStyle = '#010203';
      context.fillStyle = value;
      const normalized = context.fillStyle;
      context.fillStyle = '#fefdfc';
      context.fillStyle = value;
      if (context.fillStyle !== normalized) throw Error('Invalid computed paint: ' + value);
      if (/^#[0-9a-f]{6}$/i.test(normalized)) return [
        parseInt(normalized.slice(1, 3), 16), parseInt(normalized.slice(3, 5), 16),
        parseInt(normalized.slice(5, 7), 16), 1
      ];
      const channels = normalized.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3) throw Error('Unsupported computed paint: ' + value);
      return [...channels.slice(0, 3), channels[3] ?? 1];
    }
    function over(top, bottom) {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [...top.slice(0, 3).map((channel, index) =>
        (channel * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha
      ), alpha];
    }
    function surface(element) {
      const ancestors = [];
      for (let current = element; current; current = current.parentElement) ancestors.unshift(current);
      return ancestors.reduce((paint, ancestor) => over(colour(getComputedStyle(ancestor).backgroundColor), paint), [255, 255, 255, 1]);
    }
    function opacity(element) {
      let alpha = 1;
      for (let current = element; current; current = current.parentElement) alpha *= Number(getComputedStyle(current).opacity);
      return alpha;
    }
    function sample(selector, { property = 'color', paint, rectSelector, surfaceSelector, outside = false, pseudo } = {}) {
      const element = document.querySelector(selector);
      if (!element) throw Error('Missing contrast target: ' + selector);
      const style = getComputedStyle(element, pseudo);
      let background = surface(outside ? element.parentElement : element);
      if (surfaceSelector) {
        const backgroundElement = document.querySelector(surfaceSelector);
        if (!backgroundElement) throw Error('Missing surrounding contrast surface: ' + surfaceSelector);
        background = surface(backgroundElement);
      }
      if (rectSelector) {
        const rect = document.querySelector(rectSelector);
        if (!rect) throw Error('Missing underlying slide rect: ' + rectSelector);
        const fill = colour(getComputedStyle(rect).fill);
        fill[3] *= Number(getComputedStyle(rect).fillOpacity) * opacity(rect);
        background = over(fill, surface(rect));
      }
      const rawForeground = paint ?? style.getPropertyValue(property);
      const foreground = colour(rawForeground);
      foreground[3] *= opacity(element) * (property === 'fill' ? Number(style.fillOpacity) : 1);
      return {
        selector, property, pseudo: pseudo || null, rawForeground,
        foreground: over(foreground, background), background,
        visible: Boolean(element.getClientRects().length) && style.visibility !== 'hidden' && style.display !== 'none'
      };
    }
    window.__tqContrast = { colour, over, surface, sample };
  });
}

async function sample(page, selector, options) {
  return page.evaluate(({ selector, options }) => window.__tqContrast.sample(selector, options), { selector, options });
}

async function chartSamples(page, info, { includeTooltip = true } = {}) {
  const values = await page.evaluate(includeTooltip => {
    const chart = Chart.getChart(document.querySelector('#myChart'));
    const helpers = window.__tqContrast;
    const meta = chart.getDatasetMeta(0);
    const result = [
      { target: 'chart line', paint: meta.dataset.options.borderColor, threshold: 3 },
      { target: 'chart point', paint: meta.data[0].options.backgroundColor, threshold: 3 }
    ].map(item => ({ ...item, sample: helpers.sample('#myChart', { paint: item.paint }) }));
    for (const [axis, scale] of Object.entries(chart.scales)) {
      if (!scale._labelItems?.length) throw Error('Native chart axis has no drawn label items: ' + axis);
      for (const [index, item] of scale._labelItems.entries()) result.push({
        target: 'drawn chart tick label', axis, index, label: item.label, threshold: 4.5,
        sample: helpers.sample('#myChart', { paint: item.options.color })
      });
    }
    if (!includeTooltip) return result;
    const tooltip = chart.tooltip;
    if (!tooltip || tooltip.opacity !== 1) throw Error('Native tooltip is not visible for paint measurement');
    const rawBackground = tooltip.options.backgroundColor;
    const backgroundPaint = helpers.colour(rawBackground);
    const tooltipInkAlphaMatches = backgroundPaint.slice(0, 3).join(',') === '55,50,52' && backgroundPaint[3] === .8;
    const background = helpers.over(backgroundPaint, helpers.surface(chart.canvas));
    for (const field of ['titleColor', 'bodyColor']) {
      const rawForeground = tooltip.options[field];
      result.push({ target: 'native chart tooltip ' + field, threshold: 4.5, sample: {
        rawForeground, rawBackground, tooltipInkAlphaMatches,
        foreground: helpers.over(helpers.colour(rawForeground), background), background, visible: true
      } });
    }
    return result;
  }, includeTooltip);
  for (const item of values) add({ ...info, target: item.target, axis: item.axis, index: item.index, label: item.label },
    item.sample, item.threshold, /^chart (?:line|point)$/.test(item.target) ? [252, 23, 33] : item.target.includes('tooltip') ? [255, 255, 255] : undefined);
}

async function navbarSearch(page, info) {
  const selector = '.navbar-dark .btn-outline-success';
  if (await page.locator(selector).count() !== 1) throw Error('Expected the original dark-navbar Search button');
  for (const state of ['rest', 'hover', 'focus']) {
    await page.mouse.move(1430, 990);
    await page.evaluate(() => document.activeElement?.blur());
    if (state === 'hover') await page.locator(selector).hover();
    if (state === 'focus') await page.locator(selector).focus();
    await page.waitForTimeout(180);
    add({ ...info, target: 'native navbar Search text', state }, await sample(page, selector), 4.5);
    add({ ...info, target: 'native navbar Search border', state },
      await sample(page, selector, { property: 'border-top-color', surfaceSelector: '.navbar-dark' }), 3);
  }
}

async function coreOutline(page, info, variant, { darkSurface = false } = {}) {
  const selector = `.bd-content .bd-example .btn-outline-${variant}:not(:disabled)`;
  const button = page.locator(selector).first();
  if (!await button.count()) throw Error('Missing native core outline example: ' + variant);
  if (darkSurface) {
    const actualSurface = await button.evaluate(element => {
      const wrapper = element.closest('.bd-example');
      wrapper.classList.add('bg-dark');
      return { className: wrapper.className, background: getComputedStyle(wrapper).backgroundColor };
    });
    if (actualSurface.background !== 'rgb(9, 17, 53)') throw Error('Native .bg-dark surface is not the approved Outback Indigo');
    info = { ...info, context: 'Original example wrapper with native .bg-dark utility applied in test harness', actualSurface };
  }
  for (const state of ['rest', 'hover', 'focus', 'active']) {
    await page.mouse.move(1430, 990);
    await page.evaluate(() => document.activeElement?.blur());
    if (state === 'hover' || state === 'active') await button.hover();
    if (state === 'focus') {
      await page.keyboard.press('Tab');
      await button.focus();
    }
    if (state === 'active') await page.mouse.down();
    try {
      await page.waitForTimeout(180);
      const actual = await button.evaluate(element => ({
        hover: element.matches(':hover'), focus: element.matches(':focus'),
        focusVisible: element.matches(':focus-visible'), active: element.matches(':active')
      }));
      if (state === 'focus' && (!actual.focus || !actual.focusVisible)) throw Error('Core keyboard focus-visible state was not reached');
      if (state === 'active' && !actual.active) throw Error('Core held-pointer active state was not reached');
      add({ ...info, target: 'core outline button text', variant, state, actual }, await sample(page, selector), 4.5);
      const border = await sample(page, selector, { property: 'border-top-color', outside: true });
      const fill = await sample(page, selector, { property: 'background-color', outside: true });
      const borderExteriorContrast = contrast(border.foreground, border.background);
      const fillExteriorContrast = contrast(fill.foreground, fill.background);
      const winningCue = fillExteriorContrast > borderExteriorContrast ? 'existing fill' : 'existing border';
      add({ ...info, target: 'core outline button identification boundary', variant, state, actual,
        identificationCriterion: 'At least3:1 through the existing control fill OR border against its actual immediate exterior',
        boundaryEvidence: { border, fill, borderExteriorContrast, fillExteriorContrast, borderFillContrast: contrast(border.foreground, fill.foreground), winningCue } },
        winningCue === 'existing fill' ? fill : border, 3);
    } finally { if (state === 'active') await page.mouse.up(); }
  }
}

async function focusShadow(page, info, selector, target, { threshold = 3, expectedAlpha } = {}) {
  const element = page.locator(selector).first();
  if (!await element.count()) throw Error('Missing native focus target: ' + selector);
  await page.keyboard.press('Tab');
  await element.focus();
  await page.waitForTimeout(180);
  const state = await element.evaluate(element => {
    const style = getComputedStyle(element);
    return { focus: element.matches(':focus'), focusVisible: element.matches(':focus-visible'), boxShadow: style.boxShadow };
  });
  if (!state.focus || !state.focusVisible) throw Error('Native keyboard focus-visible was not reached: ' + target);
  const paints = state.boxShadow.match(/rgba?\([^)]*\)|#[a-f\d]{3,8}/gi) || [];
  if (paints.length !== 1) throw Error('Expected the single native default focus shadow: ' + state.boxShadow);
  if (expectedAlpha !== undefined) {
    const alpha = await page.evaluate(paint => window.__tqContrast.colour(paint)[3], paints[0]);
    if (alpha !== expectedAlpha) throw Error('Native validation focus shadow alpha changed: ' + alpha);
    state.shadowAlpha = alpha;
  }
  add({ ...info, target, state: 'keyboard focus', actual: state },
    await sample(page, selector, { paint: paints[0], outside: true }), threshold);
}

async function validationFocus(page, info) {
  for (const [control, selector] of [
    ['form-control', '#validationServer01'], ['form-select', '#validationServer04'],
    ['form-check', '#invalidCheck3']
  ]) for (const state of ['valid', 'invalid']) {
    await page.locator(selector).evaluate((element, state) => {
      element.classList.remove('is-valid', 'is-invalid');
      element.classList.add('is-' + state);
    }, state);
    await focusShadow(page, { ...info, control, validation: state,
      criterion: 'Opaque default focus indicator meets3:1 on its documented reading surface' },
    selector, 'validation focus shadow contrasts with body', { threshold: 3, expectedAlpha: 1 });
  }
}

async function feedbackIcon(page, info, selector, state, {
  target = 'native form feedback SVG', expectedPaint = [252, 23, 33]
} = {}) {
  const paints = await page.evaluate(selector => {
    const element = document.querySelector(selector);
    if (!element) throw Error('Missing native validation input: ' + selector);
    const image = getComputedStyle(element).backgroundImage;
    const raw = image.replace(/^url\(/, '').replace(/\)$/, '').replace(/^["']|["']$/g, '');
    if (!raw.startsWith('data:image/svg+xml,')) throw Error('Expected the original validation SVG image');
    const svg = new DOMParser().parseFromString(decodeURIComponent(raw.slice(raw.indexOf(',') + 1)), 'image/svg+xml');
    const all = [...svg.querySelectorAll('[fill],[stroke]')].flatMap(element => ['fill', 'stroke'].map(attribute => ({
      element: element.tagName, attribute, paint: element.getAttribute(attribute)
    }))).filter(item => item.paint && !['none', 'transparent'].includes(item.paint));
    if (!all.length) throw Error('No visible feedback SVG paint found');
    return [...new Set(all.map(item => item.paint))].map(paint => ({ paint, roles: all.filter(item => item.paint === paint) }));
  }, selector);
  for (const { paint, roles } of paints) add({ ...info, target, state, roles },
    await sample(page, selector, { paint }), 3, expectedPaint);
}

async function checkedValidationPaint(page, info) {
  for (const type of ['checkbox', 'radio']) {
    const input = page.locator(`.bd-content .bd-example .form-check-input[type="${type}"]:not(:disabled)`).first();
    if (!await input.count()) throw Error('Missing original enabled native ' + type);
    const id = await input.getAttribute('id');
    if (!id) throw Error('Expected original native validation target ID');
    const selector = '#' + id;
    for (const mechanism of ['fallback classes', 'native validity']) for (const state of ['valid', 'invalid']) {
      await input.evaluate((element, { mechanism, state }) => {
        const ancestor = element.closest('.bd-example');
        if (!ancestor) throw Error('Missing original example ancestor');
        ancestor.classList.remove('was-validated');
        element.classList.remove('is-valid', 'is-invalid');
        element.setCustomValidity('');
        if (mechanism === 'fallback classes') element.classList.add('is-' + state);
        else {
          ancestor.classList.add('was-validated');
          element.setCustomValidity(state === 'invalid' ? 'Validation test state' : '');
        }
      }, { mechanism, state });
      await input.check();
      await page.mouse.move(1430, 990);
      await input.evaluate(element => element.blur());
      const actual = await input.evaluate(element => ({
        checked: element.checked, valid: element.matches(':valid'), invalid: element.matches(':invalid'),
        fallbackValid: element.classList.contains('is-valid'), fallbackInvalid: element.classList.contains('is-invalid'),
        validatedAncestor: Boolean(element.closest('.was-validated')),
        backgroundColor: getComputedStyle(element).backgroundColor
      }));
      if (!actual.checked || (mechanism === 'native validity' && !actual[state])) throw Error('Native checked validation state was not reached');
      const expectedBackground = state === 'valid' ? 'rgb(0, 118, 108)' : 'rgb(138, 0, 8)';
      if (actual.backgroundColor !== expectedBackground) throw Error('Checked validation did not use its approved semantic background: ' + actual.backgroundColor);
      await feedbackIcon(page, { ...info, control: type, mechanism, actual }, selector, state,
        { target: 'native checked validation glyph', expectedPaint: [255, 255, 255] });
    }
  }
}

async function progressPaint(page, info) {
  const zero = '.bd-content .bd-example .progress[aria-label="Basic example"][aria-valuenow="0"]';
  const partial = '.bd-content .bd-example .progress[aria-label="Basic example"][aria-valuenow="25"]';
  for (const [selector, state] of [[zero, 'zero'], [partial, 'partial']]) {
    add({ ...info, target: 'progress track differs from body', state, criterion: 'Different paint only; no3:1 unfilled-track claim' },
      await sample(page, selector, { property: 'background-color', outside: true }), 1.000001);
  }
  add({ ...info, target: 'primary progress fill versus track' },
    await sample(page, partial + ' > .progress-bar', { property: 'background-color', surfaceSelector: partial }), 3);
  for (const variant of ['info', 'warning']) {
    const selector = `.bd-content .bd-example .progress > .progress-bar.bg-${variant}`;
    const value = await page.locator(selector).first().evaluate(element => {
      const helpers = window.__tqContrast, style = getComputedStyle(element);
      const background = helpers.surface(element.parentElement), rawForeground = style.backgroundColor;
      return { rawForeground, foreground: helpers.over(helpers.colour(rawForeground), background), background, visible: Boolean(element.getClientRects().length) };
    });
    add({ ...info, target: 'native utility progress fill differs from track', variant, criterion: 'Different paint only; no3:1 variant-track claim' }, value, 1.000001);
  }
}

async function rangePaint(page, info) {
  const control = page.locator('#range1');
  await control.scrollIntoViewIfNeeded();
  if (await control.evaluate(element => element.valueAsNumber) !== 50) throw Error('Expected native default range midpoint for actual pixel sampling');
  const png = await control.screenshot();
  const pixels = await page.evaluate(async png => {
    const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const at = (x, y) => [...context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data];
    const track = at(canvas.width * .2, canvas.height * .5), thumb = at(canvas.width * .5, canvas.height * .5);
    if (track[3] !== 255 || thumb[3] !== 255) throw Error('Expected opaque actual range paint pixels');
    return { track: [...track.slice(0, 3), 1], thumb: [...thumb.slice(0, 3), 1], background: window.__tqContrast.surface(document.querySelector('#range1').parentElement) };
  }, png.toString('base64'));
  const screenshotSHA256 = sha(png);
  add({ ...info, target: 'range track differs from body', screenshotSHA256, criterion: 'Different paint only; no3:1 unfilled-track claim' },
    { foreground: pixels.track, background: pixels.background, visible: true, source: 'Actual rendered range screenshot track pixel' }, 1.000001);
  add({ ...info, target: 'range thumb versus track', screenshotSHA256 },
    { foreground: pixels.thumb, background: pixels.track, visible: true, source: 'Actual rendered range screenshot thumb and track pixels' }, 3, info.theme === 'dark' ? [252, 84, 92] : [227, 27, 35]);
}

async function settle(page, theme) {
  await page.evaluate(async theme => {
    document.documentElement.dataset.bsTheme = theme;
    for (const element of document.querySelectorAll('.carousel')) bootstrap.Carousel.getOrCreateInstance(element, { interval: false }).pause();
    if (window.Chart) for (const chart of Object.values(Chart.instances)) { chart.stop(); chart.update('none'); }
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, theme);
  // Flush genuine rendered paint before WebKit computed-style measurements.
  // This captures the page without changing its styles or DOM.
  return sha(await page.screenshot());
}

async function carousel(page, info, selector) {
  const total = await page.locator(`${selector} .carousel-item`).count();
  if (total !== 3) throw Error(`Expected three slides: ${selector}, found ${total}`);
  for (let slide = 0; slide < total; slide++) {
    await page.evaluate(async ({ selector, slide }) => {
      const element = document.querySelector(selector);
      const instance = bootstrap.Carousel.getOrCreateInstance(element, { interval: false });
      instance.pause();
      const active = [...element.querySelectorAll('.carousel-item')].findIndex(item => item.classList.contains('active'));
      if (active !== slide) await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('Native carousel slide did not finish')), 2500);
        element.addEventListener('slid.bs.carousel', () => { clearTimeout(timeout); resolve(); }, { once: true });
        instance.to(slide);
      });
      instance.pause();
    }, { selector, slide });
    const prefix = `${selector} .carousel-item.active`;
    const rectSelector = `${prefix} svg.bd-placeholder-img rect`;
    for (const suffix of ['.carousel-caption h5', '.carousel-caption p', 'svg.bd-placeholder-img text']) {
      const property = suffix.startsWith('svg') ? 'fill' : 'color';
      add({ ...info, target: 'carousel label', carousel: selector, slide: slide + 1 },
        await sample(page, `${prefix} ${suffix}`, { property, rectSelector }), 4.5);
    }
    for (const side of ['prev', 'next']) {
      const iconSelector = `${selector} .carousel-control-${side}-icon`;
      const paint = await page.evaluate(selector => {
        const element = document.querySelector(selector), style = getComputedStyle(element);
        const url = style.backgroundImage.replace(/^url\(/, '').replace(/\)$/, '').replace(/^["']|["']$/g, '');
        const xml = decodeURIComponent(url.slice(url.indexOf(',') + 1));
        const svg = new DOMParser().parseFromString(xml, 'image/svg+xml');
        let channels = window.__tqContrast.colour(svg.documentElement.getAttribute('fill'));
        const filters = [];
        for (let current = element; current; current = current.parentElement) {
          const filter = getComputedStyle(current).filter;
          if (filter !== 'none') filters.push(filter);
        }
        for (const filter of filters) for (const match of filter.matchAll(/([a-z]+)\(([^)]+)\)/g)) {
          const amount = Number.parseFloat(match[2]) / (match[2].includes('%') ? 100 : 1);
          if (match[1] === 'invert') channels = [...channels.slice(0, 3).map(value => value * (1 - amount) + (255 - value) * amount), channels[3]];
          else if (match[1] === 'grayscale') {
            const factor = Math.min(1, amount), gray = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
            channels = [...channels.slice(0, 3).map(value => value * (1 - factor) + gray * factor), channels[3]];
          } else throw Error('Unreviewed native carousel paint filter: ' + filter);
        }
        return `rgba(${channels.slice(0, 3).join(',')},${channels[3]})`;
      }, iconSelector);
      add({ ...info, target: 'native carousel control', carousel: selector, slide: slide + 1, side },
        await sample(page, iconSelector, { paint, rectSelector }), 3);
    }
  }
}

await fs.mkdir(path.dirname(output), { recursive: true });
report.assetsAtStart = await fingerprints();
let chartBytes;
try {
  const response = await fetch(chartURL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('HTTP ' + response.status);
  chartBytes = Buffer.from(await response.arrayBuffer());
  const sri = 'sha384-' + createHash('sha384').update(chartBytes).digest('base64');
  if (sri !== expectedChartSRI) throw Error('Pinned Chart.js SRI does not match');
  report.externalDependencies.push({ url: chartURL, sha256: sha(chartBytes), bytes: chartBytes.length, sri, pinnedSRIVerified: true });
} catch (error) { report.findings.push({ target: 'original Chart.js dependency', error: error.message }); }

for (const browserName of browserNames) {
  const browserType = { chromium, firefox, webkit }[browserName];
  if (!browserType) throw Error('Unknown browser: ' + browserName);
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.href === chartURL && chartBytes) return route.fulfill({ body: chartBytes, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    if (!report.blockedExternalResources.includes(url.href)) report.blockedExternalResources.push(url.href);
    return route.abort();
  });
  const page = await context.newPage();
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    async function visit(relative, test) {
      const info = { browser: browserName, theme, page: relative, width: 1440 };
      try {
        await page.goto(base + relative, { waitUntil: 'load' });
        await page.waitForFunction(() => Boolean(window.bootstrap?.Carousel));
        info.displayListScreenshotSHA256 = await settle(page, theme);
        await installHelpers(page);
        await test(info);
      } catch (error) { report.findings.push({ ...info, error: error.message }); }
    }
    for (const direction of ['', '-rtl']) await visit(`/docs/5.3/examples/dashboard${direction}/`, async info => {
      await page.waitForFunction(() => Boolean(window.Chart?.getChart(document.querySelector('#myChart'))), undefined, { timeout: 10000 });
      if (theme === 'light') {
        await page.mouse.move(1430, 990);
        const toolbar = page.locator('.btn-toolbar .btn-outline-secondary');
        if (await toolbar.count() !== 3) throw Error('Expected the three original light Dashboard secondary toolbar buttons');
        for (let index = 0; index < 3; index++) {
          const samples = await toolbar.nth(index).evaluate(element => {
            const helpers = window.__tqContrast, style = getComputedStyle(element);
            return ['color', 'border-top-color'].map(property => {
              const background = helpers.surface(property === 'color' ? element : element.parentElement);
              const rawForeground = style.getPropertyValue(property);
              return { property, rawForeground, foreground: helpers.over(helpers.colour(rawForeground), background), background, visible: Boolean(element.getClientRects().length) };
            });
          });
          for (const value of samples) add({ ...info, target: value.property === 'color' ? 'Dashboard secondary toolbar text' : 'Dashboard secondary toolbar border', index, state: 'rest' }, value, value.property === 'color' ? 4.5 : 3);
        }
      }
      await page.evaluate(() => {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        chart.stop(); chart.update('none');
        const meta = chart.getDatasetMeta(0);
        const position = meta.data[0].getProps(['x', 'y'], true);
        chart.tooltip.setActiveElements([{ datasetIndex: 0, index: 0 }], position);
        chart.update('none');
      });
      await page.waitForFunction(() => {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        return chart.tooltip.opacity === 1 && Object.values(chart.scales).every(scale => scale._labelItems?.length);
      }, undefined, { timeout: 5000 });
      await chartSamples(page, { ...info, state: 'initialised chart' });
      add({ ...info, target: 'selected dashboard navigation' }, await sample(page, '.sidebar .nav-link.active'), 4.5);
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      await page.evaluate(async nextTheme => {
        document.documentElement.dataset.bsTheme = nextTheme;
        // Do not call chart.update here: the shipped paint observer must refresh
        // the native chart's drawn label cache after a theme change.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 180));
      }, nextTheme);
      await page.waitForFunction(() => {
        const chart = Chart.getChart(document.querySelector('#myChart'));
        return Object.values(chart.scales).every(scale => scale._labelItems?.length);
      }, undefined, { timeout: 5000 });
      await chartSamples(page, { ...info, theme: nextTheme, fromTheme: theme, state: 'in-place theme switch without test chart.update' }, { includeTooltip: false });
    });
    await visit('/docs/5.3/examples/offcanvas-navbar/', async info => {
      const rest = '.nav-scroller .nav-link:not(.active)';
      await page.mouse.move(1430, 990);
      add({ ...info, target: 'secondary navigation rest' }, await sample(page, rest), 4.5);
      await page.locator(rest).first().hover();
      add({ ...info, target: 'secondary navigation hover' }, await sample(page, rest), 4.5);
      await page.mouse.move(1430, 990);
      add({ ...info, target: 'secondary navigation selected' }, await sample(page, '.nav-scroller .nav-link.active'), 4.5);
      await navbarSearch(page, info);
    });
    for (const direction of ['', '-rtl']) await visit(`/docs/5.3/examples/carousel${direction}/`, info => navbarSearch(page, info));
    await visit('/docs/5.3/examples/sidebars/', async info => {
      const toggles = await page.locator('.btn-toggle').evaluateAll(elements => elements.map(element => element.getAttribute('data-bs-target')));
      if (toggles.length !== 4 || toggles.some(value => !value)) throw Error('Expected all four native sidebar toggles');
      for (const target of toggles) for (const state of ['rest', 'hover']) {
        const selector = `.btn-toggle[data-bs-target="${target}"]`;
        await page.mouse.move(1430, 990);
        if (state === 'hover') await page.locator(selector).hover();
        await page.waitForTimeout(180);
        const stroke = await page.evaluate(selector => {
          const value = getComputedStyle(document.querySelector(selector), '::before').content;
          const raw = value.replace(/^url\(/, '').replace(/\)$/, '').replace(/^["']|["']$/g, '');
          const xml = decodeURIComponent(raw.slice(raw.indexOf(',') + 1));
          return new DOMParser().parseFromString(xml, 'image/svg+xml').querySelector('path').getAttribute('stroke');
        }, selector);
        add({ ...info, target: 'sidebar disclosure stroke', disclosure: target, state },
          await sample(page, selector, { paint: stroke, pseudo: '::before' }), 3);
      }
    });
    await visit('/docs/5.3/examples/cover/', async info => {
      const selector = '.nav-masthead .nav-link:not(.active)';
      const count = await page.locator(selector).count();
      if (count !== 2) throw Error('Expected both inactive native cover navigation links');
      for (let index = 0; index < count; index++) for (const state of ['rest', 'hover', 'focus']) {
        await page.mouse.move(1430, 990);
        await page.evaluate(() => document.activeElement?.blur());
        const link = page.locator(selector).nth(index);
        if (state === 'hover') await link.hover();
        if (state === 'focus') await link.focus();
        const value = await link.evaluate(element => {
          const helpers = window.__tqContrast, style = getComputedStyle(element);
          const background = helpers.surface(element);
          return { rawForeground: style.color, foreground: helpers.over(helpers.colour(style.color), background), background, visible: Boolean(element.getClientRects().length) };
        });
        add({ ...info, target: 'inactive cover navigation text', index, state }, value, 4.5);
      }
      add({ ...info, target: 'cover footer reading text' }, await sample(page, '.cover-container footer p'), 4.5);
    });
    for (const direction of ['', '-rtl']) await visit(`/docs/5.3/examples/blog${direction}/`, async info => {
      const metadata = page.locator('.blog-post-meta');
      const count = await metadata.count();
      if (count !== 3) throw Error('Expected all three native blog date/author metadata paragraphs');
      for (let index = 0; index < count; index++) {
        const value = await metadata.nth(index).evaluate(element => {
          const helpers = window.__tqContrast, style = getComputedStyle(element);
          const background = helpers.surface(element);
          return { rawForeground: style.color, foreground: helpers.over(helpers.colour(style.color), background), background, visible: Boolean(element.getClientRects().length) };
        });
        add({ ...info, target: 'blog metadata reading text', index }, value, 4.5);
      }
    });
    await visit('/docs/5.3/examples/dropdowns/', async info => {
      const selector = '.dropdown-item-danger';
      if (await page.locator(selector).count() !== 1) throw Error('Expected the native danger dropdown demonstration');
      for (const state of ['rest', 'hover', 'focus']) {
        await page.mouse.move(1430, 990);
        await page.evaluate(() => document.activeElement?.blur());
        if (state === 'hover') await page.locator(selector).hover();
        if (state === 'focus') await page.locator(selector).focus();
        add({ ...info, target: 'danger dropdown item text', state }, await sample(page, selector), 4.5);
      }
    });
    await visit('/docs/5.3/components/buttons/', async info => {
      if (theme === 'light') await coreOutline(page, info, 'secondary');
      await coreOutline(page, info, 'info', { darkSurface: true });
    });
    await visit('/docs/5.3/helpers/focus-ring/', info => focusShadow(page, info,
      '.bd-content .bd-example .focus-ring:not([style])', 'default focus helper shadow'));
    await visit('/docs/5.3/components/navs-tabs/', info => focusShadow(page, info,
      '.bd-content .bd-example .nav-link:not(.active):not(.disabled)', 'default navigation focus shadow'));
    await visit('/docs/5.3/components/progress/', info => progressPaint(page, info));
    await visit('/docs/5.3/forms/range/', info => rangePaint(page, info));
    await visit('/docs/5.3/forms/validation/', async info => {
      const expectedValid = await page.evaluate(() => window.__tqContrast.colour('rgb(0, 151.2, 139.5)').slice(0, 3));
      await feedbackIcon(page, info, '#validationServer01', 'valid', { expectedPaint: expectedValid });
      await feedbackIcon(page, info, '#validationServerUsername', 'invalid');
      await validationFocus(page, info);
    });
    await visit('/docs/5.3/forms/checks-radios/', info => checkedValidationPaint(page, info));
    for (const direction of ['', '-rtl']) await visit(`/docs/5.3/examples/cheatsheet${direction}/`, async info => {
      const selector = '.bd-aside .btn';
      const stroke = await page.evaluate(selector => {
        const value = getComputedStyle(document.querySelector(selector), '::before').content;
        const raw = value.replace(/^url\(/, '').replace(/\)$/, '').replace(/^["']|["']$/g, '');
        const xml = decodeURIComponent(raw.slice(raw.indexOf(',') + 1));
        return new DOMParser().parseFromString(xml, 'image/svg+xml').querySelector('path').getAttribute('stroke');
      }, selector);
      add({ ...info, target: 'disclosure arrow' }, await sample(page, selector, { paint: stroke, pseudo: '::before' }), 3);
      await carousel(page, info, '#carouselExampleCaptions');
    });
    await visit('/docs/5.3/components/carousel/', async info => {
      await carousel(page, info, '#carouselExampleCaptions');
      await carousel(page, info, '#carouselExampleDark');
    });
    await visit('/docs/5.3/content/images/', async info => {
      const count = await page.locator('.bd-example svg.bd-placeholder-img').count();
      if (count < 1) throw Error('No shared inline SVG placeholders found');
      for (let index = 0; index < count; index++) {
        const selector = `.bd-example svg.bd-placeholder-img`;
        const value = await page.locator(selector).nth(index).evaluate(svg => {
          const helpers = window.__tqContrast;
          const label = svg.querySelector('text');
          const rect = svg.querySelector('rect');
          const background = helpers.over(helpers.colour(getComputedStyle(rect).fill), helpers.surface(rect));
          const foreground = helpers.over(helpers.colour(getComputedStyle(label).fill), background);
          return { rawForeground: getComputedStyle(label).fill, foreground, background, visible: Boolean(svg.getClientRects().length) };
        });
        add({ ...info, target: 'shared inline SVG placeholder', index }, value, 4.5);
      }
    });
    await visit('/docs/5.3/utilities/object-fit/', async info => {
      const images = page.locator('.bd-example img[src^="data:image/svg+xml,"]');
      const count = await images.count();
      if (count < 1) throw Error('No generated data-URI placeholders found');
      for (let index = 0; index < count; index++) {
        const value = await images.nth(index).evaluate(async img => {
          await img.decode();
          const xml = decodeURIComponent(img.src.slice(img.src.indexOf(',') + 1));
          const svg = new DOMParser().parseFromString(xml, 'image/svg+xml');
          const rawForeground = svg.querySelector('text').getAttribute('fill');
          const rawBackground = svg.querySelector('rect').getAttribute('fill');
          const foreground = window.__tqContrast.colour(rawForeground);
          const background = window.__tqContrast.colour(rawBackground);
          const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          const pixel = [...ctx.getImageData(2, 2, 1, 1).data];
          const renderedSurfaceMatches = pixel.slice(0, 3).every((channel, i) => channel === background[i]) && pixel[3] === 255;
          return { rawForeground, rawBackground, foreground, background, renderedSurfacePixel: pixel, renderedSurfaceMatches, visible: Boolean(img.getClientRects().length) };
        });
        add({ ...info, target: 'shared generated image placeholder', index }, value, 4.5);
        if (!value.renderedSurfaceMatches) report.findings.push({ ...info, target: 'generated image surface pixel', index, value });
      }
    });
    console.log(`${browserName}: measured targeted ${theme} example paint`);
  }
  await browser.close();
}

report.assetsAtEnd = await fingerprints();
const frozen = JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd);
if (!frozen) report.findings.push({ target: 'asset fingerprints', error: 'Product assets or contrast script changed during the audit' });
report.finished = new Date().toISOString();
report.summary = {
  browsers: browserNames, modes: ['light', 'dark'], checks: report.checks.length,
  passed: report.checks.filter(check => check.pass).length,
  failed: report.checks.filter(check => !check.pass).length + report.findings.filter(finding => !('ratio' in finding)).length,
  findings: report.findings.length, minimumTextContrast: Math.min(...report.checks.filter(check => check.threshold === 4.5).map(check => check.contrast)),
  minimumGraphicalContrast: Math.min(...report.checks.filter(check => check.threshold === 3).map(check => check.contrast)),
  assetsFrozen: frozen
};
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.failed || report.summary.findings) process.exitCode = 1;
