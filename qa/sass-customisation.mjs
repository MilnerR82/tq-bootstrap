import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import {chromium, firefox, webkit} from 'playwright';
import {maskCSS, model, differences, validationOverlay} from './compiled-parity.mjs';
import {accessibleSource,accessibleOverlay,forcedSource} from './remediation/approved-paint-literals.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceOnly = process.argv.includes('--source-only');
const browserNames = (process.env.TQ_SASS_BROWSERS || 'chromium,firefox,webkit').split(',');
const output = path.join(root, 'qa/results', process.env.TQ_SASS_REPORT || 'sass-customisation.json');
const compileOptions = {
  loadPaths: [path.join(root, 'src/scss'), path.join(root, 'node_modules')],
  style: 'expanded',
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  logger: {warn() {}, debug() {}}
};
const cases = [
  {id: 'default', prefix: 'bs-', definitions: ''},
  {id: 'prefix', prefix: 'tq-test-', definitions: '$prefix: tq-test-;'},
  {id: 'legacy-prefix', prefix: 'tq-legacy-', definitions: '$variable-prefix: tq-legacy-;'},
  {id: 'prefix-precedence', prefix: 'tq-current-', definitions: '$variable-prefix: old-; $prefix: tq-current-;'},
  {id: 'custom-focus-geometry', prefix: 'tq-size-', definitions: '$prefix: tq-size-; $input-btn-focus-blur: 1px; $input-btn-focus-width: .4rem;'}
];
const report = {
  suite: 'Bootstrap Sass customisation and colour alias resolution',
  started: new Date().toISOString(),
  method: 'Compile current and legacy CSS variable prefixes, their precedence, and customised focus geometry from both pinned native Bootstrap and TQ source. Compare every non-paint AST rule/declaration against native plus independent literal approved accessibility layers. Verify CSS custom-property declarations/references use the requested prefix, retaining only identical native foreign-prefix interfaces such as --bs-position, and introduce no unresolved reference beyond native. Resolve colour aliases and original keyboard focus shadows in real Chromium, Firefox and WebKit light/dark contexts. Separately exercise native-shaped and differently structured custom validation shadows.',
  source: [],
  runtime: [],
  customShadows: [],
  findings: [],
  limits: ['These checks verify the tested Sass interfaces and paint aliases. They do not establish WCAG conformance or every possible author-supplied Sass configuration.']
};

async function sourceFingerprints() {
  const files = ['src/scss/_tokens.scss', 'src/scss/_validation-colours.scss', 'src/scss/_validation-focus-colours.scss', 'src/scss/_accessible-colours.scss', 'src/scss/_forced-colours.scss', 'qa/remediation/approved-paint-literals.mjs', 'src/scss/tq-bootstrap.scss', 'qa/compiled-parity.mjs', 'qa/sass-customisation.mjs'];
  return Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
}

function variableInventory(css) {
  const ast = postcss.parse(css);
  const declared = new Set(), referenced = new Set();
  ast.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) declared.add(declaration.prop);
    for (const match of declaration.value.matchAll(/\bvar\(\s*(--[\w-]+)/g)) referenced.add(match[1]);
  });
  return {declared: [...declared].sort(), referenced: [...referenced].sort(), undeclared: [...referenced].filter(name => !declared.has(name)).sort()};
}

function geometryModel(css, prefix) {
  // Reuse the strict shadow paint-position parser. Only the requested prefix's
  // known body-colour alias is renamed for that parser; every dimension,
  // unknown variable, selector and declaration remains part of comparison.
  return model(maskCSS(css.replaceAll('--'+prefix, '--bs-')));
}

function compile(definitions, entry) {
  return sass.compileString(definitions + '\n@import "' + entry + '";', compileOptions).css;
}

report.sourceAtStart = await sourceFingerprints();
const compiled = new Map();
for (const item of cases) {
  const themed = compile(item.definitions, 'tq-bootstrap');
  const native = compile(item.definitions, 'bootstrap/scss/bootstrap');
  const paletteDefinitions = '$tq-red:#e31b23; $tq-red-dark:#8a0008; $tq-red-light:#fc545c; $tq-red-bright:#fc1721; $tq-pink:#f32a7c; $tq-ink:#373234; $tq-muted:#696567; $tq-koala:#d7d2cb; $tq-divider:#e1ddd8; $tq-warm:#f1efed; $tq-white:#fff; $tq-purple:#6c0162; $tq-orange:#ff4904; $tq-teal:#00a89b; $tq-teal-dark:#00766c; $tq-indigo:#091135; $tq-indigo-light:#2f4370; $primary:#e31b23; $secondary:#696567; $success:#00766c; $info:#00a89b; $warning:#ff4904; $danger:#8a0008; $light:#f1efed; $dark:#091135; $color-contrast-dark:#091135;';
  // Independently reviewed paint defaults, never read from product tokens.
  // Use the requested case prefix without changing native prefix precedence.
  const controlDefinitions = '$input-border-color:var(--'+item.prefix+'secondary-color) !default; $form-check-input-border:var(--'+item.prefix+'border-width) solid var(--'+item.prefix+'secondary-color) !default; $form-range-thumb-bg:var(--tq-range-thumb-bg,var(--tq-mode-range-thumb-bg,#{$primary})) !default; $form-range-thumb-active-bg:var(--tq-range-thumb-active-bg,var(--tq-mode-range-thumb-active-bg,#{$tq-red-dark})) !default; $form-range-track-bg:var(--tq-range-track-bg,var(--tq-mode-range-track-bg,#{$tq-koala})) !default; $btn-close-color:#091135 !default; $carousel-dark-indicator-active-bg:#091135 !default; $progress-bg:#e1ddd8 !default;';
  const nativeWithOverlay = sass.compileString(item.definitions+'\n'+paletteDefinitions+'\n'+controlDefinitions+'\n@import \"bootstrap/scss/bootstrap\";\n'+validationOverlay.replaceAll('--bs-', '--'+item.prefix)+'\n'+accessibleSource+'\n'+forcedSource,compileOptions).css;
  const approvedForeign = new Set([...variableInventory(nativeWithOverlay).declared,...variableInventory(nativeWithOverlay).referenced].filter(name=>name.startsWith('--tq-')));
  const findings = differences(geometryModel(nativeWithOverlay, item.prefix), geometryModel(themed, item.prefix));
  const actualVariables = variableInventory(themed), originalVariables = variableInventory(native);
  const foreignVariables = [...new Set([...actualVariables.declared, ...actualVariables.referenced])].filter(name => !name.startsWith('--' + item.prefix));
  const nativeForeignVariables = [...new Set([...originalVariables.declared, ...originalVariables.referenced])].filter(name => !name.startsWith('--' + item.prefix));
  const addedForeignVariables = foreignVariables.filter(name => !nativeForeignVariables.includes(name)&&!approvedForeign.has(name));
  const missingNativeForeignVariables = nativeForeignVariables.filter(name => !foreignVariables.includes(name));
  const foreignInventoryMatchesNative = JSON.stringify(foreignVariables.filter(name=>!approvedForeign.has(name)).sort()) === JSON.stringify([...nativeForeignVariables].sort());
  const addedUndeclaredReferences = actualVariables.undeclared.filter(name => !originalVariables.undeclared.includes(name));
  const pass = !findings.length && foreignInventoryMatchesNative && !addedUndeclaredReferences.length;
  report.source.push({id: item.id, prefix: item.prefix, definitions: item.definitions, nativeSHA256: sha(native), actualSHA256: sha(themed), nativePaintMaskedSHA256: sha(JSON.stringify(geometryModel(nativeWithOverlay, item.prefix).records)), actualPaintMaskedSHA256: sha(JSON.stringify(geometryModel(themed, item.prefix).records)), variables: actualVariables, foreignVariables, nativeForeignVariables, addedForeignVariables, missingNativeForeignVariables, foreignInventoryMatchesNative, addedUndeclaredReferences, pass, findings});
  compiled.set(item.id, themed);
}
const customCase = report.source.find(record => record.id === 'prefix');
const invalidPrefixInventory = variableInventory(compiled.get('prefix').replace('var(--tq-test-body-color)', 'var(--bs-body-color)'));
const invalidForeignVariables = [...new Set([...invalidPrefixInventory.declared, ...invalidPrefixInventory.referenced])].filter(name => !name.startsWith('--tq-test-') && !customCase.nativeForeignVariables.includes(name));
report.boundaryProbes = [
  {id: 'hardcoded-body-paint-prefix-rejected', pass: invalidForeignVariables.includes('--bs-body-color')},
  {id: 'body-paint-alias-in-shadow-dimension-rejected', pass: differences(geometryModel('.probe{box-shadow:0 0 0 .25rem #fff}', 'tq-test-'), geometryModel('.probe{box-shadow:0 0 var(--tq-test-body-color) .25rem #fff}', 'tq-test-')).length > 0}
];

const shadowCases = [
  {id: 'author-five-token-colour-and-alpha', value: '0 0 0 .25rem rgba(55, 50, 52, .25)', repaint: false},
  {id: 'five-token-numeric-inset', value: 'inset 0 0 0 1px', repaint: false},
  {id: 'six-token-inset-colour', value: 'inset 0 0 0 1px rgba(55, 50, 52, .5)', repaint: false},
  {id: 'multiple-shadows', value: '(0 0 1px #000, 0 0 2px #fff)', repaint: false},
  {id: 'four-token-geometry-only', value: '0 0 0 1px', repaint: false},
  {id: 'custom-shadow-variable', value: 'var(--author-shadow)', repaint: false}
];
for (const item of shadowCases) for (const state of ['valid', 'invalid']) {
  const source = '@import "bootstrap/scss/functions"; @import "tokens"; $form-validation-states: ("' + state + '": ("focus-box-shadow": ' + item.value + ')); $probe-before: map-get(map-get($form-validation-states,"' + state + '"),"focus-box-shadow"); @import "validation-focus-colours"; .probe { before: inspect($probe-before); after: inspect(map-get(map-get($form-validation-states,"' + state + '"),"focus-box-shadow")); }';
  const css = sass.compileString(source, compileOptions).css;
  const values = Object.fromEntries(postcss.parse(css).first.nodes.map(declaration => [declaration.prop, declaration.value]));
  const beforeMasked = geometryModel('.probe{box-shadow:' + values.before + '}', 'bs-');
  const afterMasked = geometryModel('.probe{box-shadow:' + values.after + '}', 'bs-');
  const nonPaintFindings = differences(beforeMasked, afterMasked);
  const alphaPreserved = !item.repaint || /rgba\(var\(--bs-body-color-rgb\), 0\.25\)/.test(values.after);
  const pass = item.repaint ? !nonPaintFindings.length && values.before !== values.after && alphaPreserved : values.before === values.after;
  report.customShadows.push({id: item.id, state, ...values, alphaPreserved, nonPaintFindings, pass});
}

const browserslist = (await fs.readFile(path.join(root, 'upstream/bootstrap-source/.browserslistrc'), 'utf8')).split(/\r?\n/).map(line => line.replace(/#.*/, '').trim()).filter(Boolean);
const prefixedDefault = (await postcss([autoprefixer({cascade: false, overrideBrowserslist: browserslist})]).process(compiled.get('default'), {from: undefined, map: false})).css;
const actualDistribution = await fs.readFile(path.join(root, 'dist/css/bootstrap.css'), 'utf8');
const sourceModel = model(postcss.parse(prefixedDefault)), distributionModel = model(postcss.parse(actualDistribution));
const distributionFindings = differences(sourceModel, distributionModel);
report.defaultDistribution = {sourceSHA256: sha(prefixedDefault),distributionSHA256: sha(actualDistribution), sourceASTSHA256: sha(JSON.stringify(sourceModel.records)), distributionASTSHA256: sha(JSON.stringify(distributionModel.records)), pass: !distributionFindings.length, findings: distributionFindings};

const fixture = '<main class="p-3"><label for="control">Input</label><input id="control" class="form-control"><label for="select">Select</label><select id="select" class="form-select"><option>Option</option></select><input id="check" type="checkbox" class="form-check-input" aria-label="Checkbox"><nav class="nav"><a id="nav" class="nav-link" href="#main">Navigation</a></nav><div class="accordion"><button id="accordion" class="accordion-button" type="button">Accordion</button></div><ul class="pagination"><li class="page-item"><a id="pagination" class="page-link" href="#main">Page</a></li></ul><button id="close" class="btn-close" aria-label="Close"></button><input id="valid-check" type="checkbox" checked class="form-check-input is-valid" aria-label="Valid checkbox"><input id="invalid-radio" type="radio" checked class="form-check-input is-invalid" aria-label="Invalid radio"></main>';
if (!sourceOnly) for (const name of browserNames) {
  const browser = await ({chromium, firefox, webkit}[name]).launch();
  const page = await browser.newPage({viewport: {width: 1024, height: 768}, reducedMotion: 'reduce'});
  for (const item of cases) for (const theme of ['light', 'dark']) {
    await page.setContent('<!doctype html><html lang="en" data-bs-theme="' + theme + '"><head><meta charset="utf-8"><title>Sass paint alias test</title><style>' + compiled.get(item.id) + '</style></head><body id="main">' + fixture + '</body></html>');
    await page.keyboard.press('Tab');
    for (const id of ['control', 'select', 'check', 'nav', 'accordion', 'pagination', 'close', 'valid-check', 'invalid-radio']) {
      await page.locator('#' + id).focus();
      const value = await page.locator('#' + id).evaluate((element, prefix) => {
        const style = getComputedStyle(element), body = getComputedStyle(document.body);
        const resolvedSuccessToken = style.getPropertyValue('--' + prefix + 'success').trim(), resolvedDangerToken = style.getPropertyValue('--' + prefix + 'danger').trim();
        const checkedRole = element.id === 'valid-check' ? 'success' : element.id === 'invalid-radio' ? 'danger' : null;
        const context = document.createElement('canvas').getContext('2d'), canonical = value => {context.fillStyle = '#010203'; context.fillStyle = value; return context.fillStyle;};
        return {focusVisible: element.matches(':focus-visible'), shadow: style.boxShadow, background: style.backgroundColor, bodyBackground: body.backgroundColor, bodyColour: body.color, resolvedBodyToken: style.getPropertyValue('--' + prefix + 'body-color').trim(), resolvedPrimaryToken: style.getPropertyValue('--' + prefix + 'primary').trim(), resolvedSuccessToken, resolvedDangerToken, checkedRole, canonicalBackground: canonical(style.backgroundColor), expectedCheckedBackground: checkedRole ? canonical(checkedRole === 'success' ? resolvedSuccessToken : resolvedDangerToken) : null};
      }, item.prefix);
      const pass = value.focusVisible && value.shadow !== 'none' && !value.shadow.includes('var(') && Boolean(value.resolvedBodyToken) && Boolean(value.resolvedPrimaryToken) && Boolean(value.resolvedSuccessToken) && Boolean(value.resolvedDangerToken) && (!value.checkedRole || value.canonicalBackground === value.expectedCheckedBackground);
      report.runtime.push({browser: name, id: item.id, prefix: item.prefix, theme, control: id, ...value, pass});
    }
  }
  await browser.close();
}

report.sourceAtEnd = await sourceFingerprints();
report.sourcesFrozen = JSON.stringify(report.sourceAtStart) === JSON.stringify(report.sourceAtEnd);
report.summary = {sourceCases: report.source.length, sourceFailures: report.source.filter(record => !record.pass).length, customShadowCases: report.customShadows.length, customShadowFailures: report.customShadows.filter(record => !record.pass).length, boundaryProbes: report.boundaryProbes.length, boundaryProbeFailures: report.boundaryProbes.filter(record => !record.pass).length, runtimeChecks: report.runtime.length, runtimeFailures: report.runtime.filter(record => !record.pass).length, defaultDistributionMatchesSource: report.defaultDistribution.pass, sourcesFrozen: report.sourcesFrozen};
report.finished = new Date().toISOString();
await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.sourceFailures || report.summary.customShadowFailures || report.summary.runtimeFailures || report.summary.boundaryProbeFailures || !report.defaultDistribution.pass || !report.sourcesFrozen) process.exitCode = 1;
