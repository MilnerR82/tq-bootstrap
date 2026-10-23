import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as sass from 'sass';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import yaml from 'js-yaml';
import { verifySubstitutions } from '../qa/colour-substitution-proof.mjs';
import { auditDocumentationRemediation } from '../qa/remediation/source-proof.mjs';

// Preserve the accepted pure-paint audit. Deliberate accessibility repairs are
// proved as exact reviewed deltas from that accepted source, never paint-masked.
const remediationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(remediationRoot, 'qa/remediation-source/manifest.json'))) {
  const remediation = auditDocumentationRemediation(remediationRoot);
  console.log(JSON.stringify({ status: remediation.status, summary: remediation.summary, findings: remediation.findings }, null, 2));
  process.exit(remediation.status === 'pass' ? 0 : 1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const upstream = path.resolve(here, '../upstream/bootstrap-source');
const scopes = ['site/src', 'site/data', 'site/static', 'scss', 'js', 'build'];
const rootFiles = ['site/astro.config.ts', 'site/postcss.config.cjs', 'site/tsconfig.json', 'site/.prettierrc.json', 'config.yml', 'package.json', 'package-lock.json', '.browserslistrc', 'LICENSE'];
const addedRootFiles = ['_tq-tokens.scss', 'README-TQ.md', 'build-tq-docs.mjs', 'audit-colour-only.mjs'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function inventory(base) {
  const files = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(base, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(name);
      else files[name] = sha(fs.readFileSync(path.join(base, name)));
    }
  }
  for (const scope of scopes) walk(scope);
  for (const name of rootFiles) if (fs.existsSync(path.join(base, name))) files[name] = sha(fs.readFileSync(path.join(base, name)));
  return files;
}
const original = inventory(upstream);
const actual = inventory(here);
for (const name of addedRootFiles) if (fs.existsSync(path.join(here, name))) actual[name] = sha(fs.readFileSync(path.join(here, name)));
const beforePath = path.join(here, '.cache/colour-only-before.json');
const before = fs.existsSync(beforePath) ? JSON.parse(fs.readFileSync(beforePath, 'utf8')).before : {};
const allowed = {
  'config.yml': 'Local canonical/download/compiled asset URL and SRI infrastructure only; other configuration unchanged',
  'site/src/libs/config.ts': 'Accept local CDN/download URL strings; all other schema and logic unchanged',
  'site/src/components/head/Favicons.astro': 'Only Safari mask colour and browser theme colour substituted',
  'site/static/docs/[version]/assets/img/favicons/manifest.json': 'Only manifest theme_color and background_color substituted',
  'site/src/components/head/Scss.astro': 'Colour-token and final colour stylesheet imports only; original native stylesheet imports retained',
  'site/src/components/head/ScssProd.astro': 'Final colour stylesheet import only; original docs and docs_search imports retained',
  'site/src/scss/docs.scss': 'Root colour-token import only; all native documentation geometry retained',
  'site/src/scss/docs_search.scss': 'Root colour-token import only; native hosted DocSearch stylesheet and geometry retained',
  'site/src/scss/_variables.scss': 'Only four documentation colour variables substituted',
  'site/src/scss/_tq-docs.scss': 'Added colour-only stylesheet; no shape, type, layout, spacing, opacity, transition or shadow geometry changes',
  '_tq-tokens.scss': 'Byte-identical copy of the root framework colour tokens',
  'README-TQ.md': 'Maintainer documentation; not website markup or behavior',
  'build-tq-docs.mjs': 'Local asset/SRI/download infrastructure, omission of Fathom/Carbon service loaders, and six exact nonvisual legacy href repairs recorded in tq-docs-build.json',
  'site/static/docs/[version]/assets/js/color-modes.js': 'Only the stored-theme getter/setter block gains optional-storage and invalid-value guards; all native theme controls, DOM, media and persistence behaviour for valid storage remain exact',
  'site/src/assets/stackblitz.js': 'Seven exact export-only resource/environment substitutions; local framework/docs CSS, original bundle, maps and referenced SVGs travel inside the native SDK project',
  'site/src/components/header/Versions.astro': 'User-requested Bootstrap5.3-only menu: remove other version choices and update only its heading, current-link text and hidden annotation; native classes/attributes and current-link logic remain exact',
  'audit-colour-only.mjs': 'Read-only source comparison and colour declaration audit tooling'
};
const violations = [];
const themeStorageOld = "  const getStoredTheme = () => localStorage.getItem('theme')\n  const setStoredTheme = theme => localStorage.setItem('theme', theme)";
const themeStorageNew = "  // Theme controls remain usable when storage is unavailable or contains an\n  // unrelated value. Persistence is optional; keep this page's choice in memory.\n  let currentTheme\n  const getStoredTheme = () => {\n    let theme = currentTheme\n    try {\n      theme = localStorage.getItem('theme') || currentTheme\n    } catch {}\n    return ['light', 'dark', 'auto'].includes(theme) ? theme : null\n  }\n  const setStoredTheme = theme => {\n    currentTheme = theme\n    try {\n      localStorage.setItem('theme', theme)\n    } catch {}\n  }";
const themeStoragePath = 'site/static/docs/[version]/assets/js/color-modes.js';
const normaliseNewlines = value => value.replaceAll('\r\n', '\n');
const originalThemeStorage = normaliseNewlines(fs.readFileSync(path.join(upstream, themeStoragePath), 'utf8'));
const currentThemeStorage = normaliseNewlines(fs.readFileSync(path.join(here, themeStoragePath), 'utf8'));
const themeStorageGuardExact = originalThemeStorage.split(themeStorageOld).length === 2 && originalThemeStorage.replace(themeStorageOld, themeStorageNew) === currentThemeStorage;
if (!themeStorageGuardExact) violations.push('Theme storage exception differs from the exact original getter/setter replacement');
const versionsPath='site/src/components/header/Versions.astro';
const nativeVersions=normaliseNewlines(fs.readFileSync(path.join(upstream,versionsPath),'utf8'));
const versionsTail=nativeVersions.indexOf('    <li>\n      {\n        addedIn53 ?');
const versionsEnd=nativeVersions.lastIndexOf('  </ul>');
const expectedVersions=(nativeVersions.slice(0,versionsTail)+nativeVersions.slice(versionsEnd)).replace('(switch to other versions)','(current version)').replace('>v5 releases</h6>','>v5.3</h6>').replace('Latest ({getConfig().docs_version}.x)','v{getConfig().docs_version}');
const versionScopeSourceExact=versionsTail>0&&versionsEnd>versionsTail&&expectedVersions===normaliseNewlines(fs.readFileSync(path.join(here,versionsPath),'utf8'));
if(!versionScopeSourceExact)violations.push('Unreviewed version-menu source change');
const snippetExportBytes = fs.readFileSync(path.resolve(here, '../qa/results/snippet-export.json'));
const snippetExportSource = JSON.parse(snippetExportBytes).sourceException;
let snippetReconstructed = fs.readFileSync(path.join(upstream, 'site/src/assets/stackblitz.js'), 'utf8');
if (snippetExportSource?.path !== 'site/src/assets/stackblitz.js' || snippetExportSource.substitutions?.length !== 7) violations.push('Snippet export must retain its seven reviewed source boundaries');
for (const change of snippetExportSource?.substitutions || []) {
  if (change.count !== 1 || snippetReconstructed.split(change.from).length - 1 !== change.count) violations.push('Snippet export source-boundary occurrence mismatch');
  snippetReconstructed = snippetReconstructed.split(change.from).join(change.to);
}
const snippetExportSourceExact = snippetExportSource?.pass === true && sha(snippetReconstructed) === actual['site/src/assets/stackblitz.js'] && snippetExportSource.actualSHA256 === actual['site/src/assets/stackblitz.js'] && snippetExportSource.originalSHA256 === original['site/src/assets/stackblitz.js'];
if (!snippetExportSourceExact) violations.push('Unreviewed snippet export source difference');
const derivedPreviewManifestPath = 'qa/results/example-previews.json';
const derivedPreviewSourcePrefix = 'site/static/docs/[version]/example-previews/';
const originalPreviewSourcePrefix = 'site/static/docs/[version]/assets/img/examples/';
const nativeExampleIDs = fs.readdirSync(path.join(upstream, 'site/src/assets/examples'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(upstream, 'site/src/assets/examples', entry.name, 'index.astro')))
  .map(entry => entry.name).sort();
const previewSizes = [{ density: '1x', suffix: '', width: 480, height: 300, scale: 1 / 3 }, { density: '2x', suffix: '@2x', width: 960, height: 600, scale: 2 / 3 }];
const expectedPreviewPaths = nativeExampleIDs.flatMap(id => previewSizes.map(size => `${derivedPreviewSourcePrefix}${id}${size.suffix}.png`)).sort();
const observedPreviewPaths = Object.keys(actual).filter(name => name.startsWith(derivedPreviewSourcePrefix)).sort();
const derivedPreviewFindings = [];
const derivedPreviewChecks = [];
let derivedPreviewManifestBytes, derivedPreviewManifest;
try {
  derivedPreviewManifestBytes = fs.readFileSync(path.resolve(here, '..', derivedPreviewManifestPath));
  derivedPreviewManifest = JSON.parse(derivedPreviewManifestBytes);
} catch (error) {
  derivedPreviewFindings.push(`Preview capture manifest is unavailable or invalid: ${error.message}`);
}
if (nativeExampleIDs.length !== 40 || expectedPreviewPaths.length !== 80) derivedPreviewFindings.push('Preview scope must be the exact 40 pinned native example IDs at both densities');
if (JSON.stringify(observedPreviewPaths) !== JSON.stringify(expectedPreviewPaths)) derivedPreviewFindings.push('New preview source directory must contain exactly the 80 expected PNG paths, with no additional files');
const originalPreviewPaths = Object.keys(original).filter(name => name.startsWith(originalPreviewSourcePrefix) && name.endsWith('.png')).sort();
const originalPreviewSourcesUnchanged = originalPreviewPaths.length === 80 && originalPreviewPaths.every(name => actual[name] === original[name]);
if (!originalPreviewSourcesUnchanged) derivedPreviewFindings.push('The 80 original upstream gallery PNG source files must remain byte-identical');
if (derivedPreviewManifest) {
  const manifest = derivedPreviewManifest;
  if (manifest.bootstrapVersion !== '5.3.8' || manifest.docsVersion !== '5.3' || manifest.browser !== 'Chromium' || manifest.theme !== 'light' || manifest.viewport?.width !== 1440 || manifest.viewport?.height !== 900 || manifest.summary?.pages !== 40 || manifest.summary?.images !== 80 || manifest.summary?.expectedImages !== 80 || manifest.summary?.findings !== 0 || manifest.summary?.assetsFrozen !== true || !Array.isArray(manifest.findings) || manifest.findings.length !== 0) derivedPreviewFindings.push('Preview report does not show the complete passing 40-page native light-mode capture');
  if (manifest.scriptSHA256 !== sha(fs.readFileSync(path.resolve(here, '../scripts/build-example-previews.mjs')))) derivedPreviewFindings.push('Preview capture script differs from its recorded source hash');
  if (!manifest.assetsAtStart || !manifest.assetsAtEnd || JSON.stringify(manifest.assetsAtStart) !== JSON.stringify(manifest.assetsAtEnd)) derivedPreviewFindings.push('Preview source inventory was not frozen during capture');
  const manifestPages = Array.isArray(manifest.pages) ? manifest.pages : [];
  if (manifestPages.length !== 40 || JSON.stringify(manifestPages.map(page => page?.id).sort()) !== JSON.stringify(nativeExampleIDs)) derivedPreviewFindings.push('Preview report page IDs differ from the exact pinned native example inventory');
  const images = Array.isArray(manifest.images) ? manifest.images : [];
  const recordedPaths = images.map(image => image?.path).sort();
  if (images.length !== 80 || JSON.stringify(recordedPaths) !== JSON.stringify(expectedPreviewPaths.map(name => `docs-source/${name}`))) derivedPreviewFindings.push('Preview manifest must enumerate each exact source PNG once, without additional paths');
  for (const id of nativeExampleIDs) for (const size of previewSizes) {
    const sourcePath = `${derivedPreviewSourcePrefix}${id}${size.suffix}.png`;
    const rootPath = `docs-source/${sourcePath}`;
    const matching = images.filter(image => image?.path === rootPath);
    const image = matching[0];
    const pagePath = `docs/5.3/examples/${id}/index.html`;
    const page = manifestPages.find(page => page?.id === id);
    const proof = { path: sourcePath, id, density: size.density, expectedWidth: size.width, expectedHeight: size.height, currentSHA256: actual[sourcePath] || null, recordedSHA256: image?.sha256 || null, pass: false };
    if (matching.length !== 1 || !image || image.id !== id || image.density !== size.density || image.width !== size.width || image.height !== size.height || image.deviceScaleFactor !== size.scale || image.paint?.theme !== 'light' || image.paint?.primary !== '#e31b23' || !/^[a-f\d]{64}$/.test(image.sha256 || '') || image.sha256 !== actual[sourcePath] || image.sourceHTML?.path !== pagePath || page?.path !== pagePath || image.sourceHTML?.sha256 !== page?.sha256 || image.sourceHTML?.sha256 !== manifest.sourceInputHashes?.[pagePath]) {
      proof.finding = 'Capture record does not match the exact native page, density, palette, source HTML and PNG hash boundary';
    } else {
      const bytes = fs.readFileSync(path.join(here, sourcePath));
      const nativePNG = bytes.length >= 33 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.readUInt32BE(8) === 13 && bytes.subarray(12, 16).toString('ascii') === 'IHDR';
      proof.observedWidth = nativePNG ? bytes.readUInt32BE(16) : null;
      proof.observedHeight = nativePNG ? bytes.readUInt32BE(20) : null;
      proof.bytes = bytes.length;
      proof.pass = nativePNG && proof.observedWidth === size.width && proof.observedHeight === size.height && image.bytes === bytes.length;
      if (!proof.pass) proof.finding = 'PNG signature, IHDR dimensions or byte length differs from the exact native-sized capture';
    }
    if (!proof.pass) derivedPreviewFindings.push(`Unverified derived preview: ${sourcePath}: ${proof.finding}`);
    derivedPreviewChecks.push(proof);
  }
}
const derivedPreviewCaptureExact = derivedPreviewFindings.length === 0 && derivedPreviewChecks.length === 80 && derivedPreviewChecks.every(check => check.pass);
if (derivedPreviewCaptureExact) for (const name of expectedPreviewPaths) allowed[name] = 'Native-sized light-mode viewport capture of the corresponding actual TQ example; exact 40-page/two-density path, manifest SHA-256, PNG signature and dimensions verified; original upstream PNG source retained unchanged';
else violations.push(...derivedPreviewFindings);
const paintSubstitutions = [];
const substitutionManifests = [];
for (const relative of ['qa/results/example-colour-substitutions.json', 'qa/results/docs-colour-substitutions.json', 'qa/results/inline-svg-colour-substitutions.json']) {
  const filename = path.resolve(here, '..', relative);
  const bytes = fs.readFileSync(filename);
  const manifest = JSON.parse(bytes);
  substitutionManifests.push({ path: relative, sha256: sha(bytes), files: manifest.files.length });
  for (const record of manifest.files) {
    if (!original[record.path] || !actual[record.path]) {
      violations.push(`Colour substitution must refer to an existing upstream and current source file: ${record.path}`);
      continue;
    }
    const proof = verifySubstitutions(fs.readFileSync(path.join(upstream, record.path), 'utf8'), fs.readFileSync(path.join(here, record.path), 'utf8'), record);
    paintSubstitutions.push({ path: record.path, ...proof });
    if (!proof.pass) violations.push(`Unverified colour-only source substitution: ${record.path}: ${JSON.stringify(proof.findings)}`);
    else allowed[record.path] = 'Exact replay of independently verified paint substitutions and narrowly enumerated chart paint integration; native geometry and interaction/data logic preserved; colour/paint exceptions enumerated';
  }
}
const files = [...new Set([...Object.keys(original), ...Object.keys(actual), ...Object.keys(before)])].sort().map(name => {
  const status = !original[name] && !actual[name] ? 'earlier-custom-removed' : original[name] === actual[name] ? 'identical' : !actual[name] ? 'removed' : !original[name] ? 'added' : 'modified';
  const restored = !!before[name] && before[name] !== original[name] && actual[name] === original[name];
  const record = { path: name, status, upstreamSha256: original[name] || null, beforeSha256: before[name] || null, currentSha256: actual[name] || null, restoredToOriginal: restored };
  if (status !== 'identical') {
    record.disposition = allowed[name] || (!original[name] && !actual[name] ? 'Earlier custom source removed' : null);
    if (actual[name] && !record.disposition) violations.push(`Unreviewed difference: ${name}`);
    if (status === 'modified') {
      const diff = spawnSync('git', ['diff', '--no-index', '--no-color', '--unified=3', path.join(upstream, name), path.join(here, name)], { encoding: 'utf8' });
      record.diff = diff.stdout || diff.stderr || 'Diff tool unavailable; use recorded paths/hashes';
    }
  }
  return record;
});

// Check every declaration in the sole additional UI stylesheet. Its only
// dimension-bearing values duplicate native gradient/shadow geometry verbatim.
const cssFile = path.join(here, 'site/src/scss/_tq-docs.scss');
const compiled = sass.compile(cssFile, { logger: sass.Logger.silent }).css;
const declarations = [];
postcss.parse(compiled).walkDecls(decl => {
  const allowedProperty = decl.prop.startsWith('--') || ['color', 'background-color', 'background-image', 'border-color', 'filter'].includes(decl.prop);
  declarations.push({ property: decl.prop, value: decl.value, colourProperty: allowedProperty });
  if (!allowedProperty) violations.push(`Non-colour property: ${decl.prop}`);
  if (decl.prop === 'filter' && !/^(none|var\(--tq-docs-close-filter\))$/.test(decl.value)) violations.push(`Unreviewed filter: ${decl.value}`);
});
const colourCss = fs.readFileSync(cssFile, 'utf8');
const gradientNormalize = value => value.replace(/var\(--[a-z0-9-]+\)/gi, 'var(--COLOUR)').replace(/\s+/g, '');
const nativeNav = fs.readFileSync(path.join(upstream, 'site/src/scss/_navbar.scss'), 'utf8').match(/background-image:\s*([^;]+);/)?.[1];
const nativeMast = fs.readFileSync(path.join(upstream, 'site/src/scss/_masthead.scss'), 'utf8').match(/background-image:\s*([^;]+);/)?.[1];
const newGradients = [...colourCss.matchAll(/background-image:\s*([^;]+);/g)].map(match => match[1]);
const gradientsRetainNativeGeometry = newGradients.length === 2 && gradientNormalize(newGradients[0]) === gradientNormalize(nativeNav) && gradientNormalize(newGradients[1]) === gradientNormalize(nativeMast);
if (!gradientsRetainNativeGeometry) violations.push('Gradient geometry differs from native Bootstrap');
const nativeSearchShadow = '0 0 0 .25rem rgba(COLOUR, .4)';
const customShadows = declarations.filter(decl => decl.property === '--docsearch-searchbox-shadow').map(decl => decl.value.replace(/rgba\([\d\s,]+,\s*(\.\d+)\)/, 'rgba(COLOUR, $1)'));
if (customShadows.some(value => value !== nativeSearchShadow)) violations.push('DocSearch focus shadow geometry differs from native Bootstrap');
function paintIndependentGeometry(value) {
  const parsed = valueParser(value);
  parsed.walk(node => {
    if (node.type === 'function' && /^(rgba?|hsla?)$/i.test(node.value)) {
      const args = node.nodes.filter(part => part.type !== 'space');
      const hasAlpha = /a$/i.test(node.value);
      const alpha = hasAlpha ? Number(args.at(-1)?.value) : 1;
      node.type = 'word'; node.value = `COLOUR_ALPHA_${alpha}`; delete node.nodes;
      return false;
    }
    if (node.type === 'function' && node.value === 'var') {
      node.type = 'word'; node.value = 'COLOUR_ALPHA_1'; delete node.nodes; return false;
    }
    if (node.type === 'word' && /^#[a-f\d]{3,8}$/i.test(node.value)) node.value = 'COLOUR_ALPHA_1';
  });
  return parsed.toString().replace(/(^|[^\d])0\.(\d+)/g, '$1.$2').replace(/\s+/g, '');
}
const nativeSearchDeclarations = new Map();
postcss.parse(sass.compile(path.join(here, 'site/src/scss/docs_search.scss'), { logger: sass.Logger.silent, loadPaths: [path.join(here, 'node_modules')] }).css).walkDecls(decl => {
  if (/^--docsearch-.*(?:shadow|gradient)$/.test(decl.prop)) {
    const values = nativeSearchDeclarations.get(decl.prop) || [];
    values.push(paintIndependentGeometry(decl.value)); nativeSearchDeclarations.set(decl.prop, values);
  }
});
const docSearchPaintGeometry = declarations.filter(decl => /^--docsearch-.*(?:shadow|gradient)$/.test(decl.property)).map(decl => ({
  property: decl.property, normalizedGeometry: paintIndependentGeometry(decl.value),
  matchesNative: nativeSearchDeclarations.get(decl.property)?.includes(paintIndependentGeometry(decl.value)) || false
}));
for (const value of docSearchPaintGeometry) if (!value.matchesNative) violations.push(`DocSearch shadow/gradient geometry differs: ${value.property}`);
const syncedRootTokens = sha(fs.readFileSync(path.join(here, '_tq-tokens.scss'))) === sha(fs.readFileSync(path.resolve(here, '../src/scss/_tokens.scss')));
if (!syncedRootTokens) violations.push('Root and documentation colour tokens differ');

const sourceConfig = yaml.load(fs.readFileSync(path.join(upstream, 'config.yml'), 'utf8'));
const localConfig = yaml.load(fs.readFileSync(path.join(here, 'config.yml'), 'utf8'));
const configChanges = [];
function compareConfig(a, b, prefix = '') {
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (a?.[key] && typeof a[key] === 'object') compareConfig(a[key], b?.[key], name);
    else if (a?.[key] !== b?.[key]) configChanges.push({ path: name, upstream: a?.[key], current: b?.[key] });
  }
}
compareConfig(sourceConfig, localConfig);
for (const change of configChanges) if (!/^(baseURL|download\.(source|dist|dist_examples)|cdn\.(css|css_rtl|js|js_bundle)(?:_hash)?)$/.test(change.path)) violations.push(`Unexpected config change: ${change.path}`);
const requiredDownloadPaths = {source: '/release/tq-bootstrap-1.0.0-source.zip', dist: '/release/tq-bootstrap-1.0.0-dist.zip', dist_examples: '/release/tq-bootstrap-1.0.0-examples.zip'};
for (const [kind, expected] of Object.entries(requiredDownloadPaths)) if (localConfig.download?.[kind] !== expected) violations.push(`Unexpected local ${kind} download path; require the independent relocatable archive ${expected}`);

function group(prefix, suffix) {
  const selected = files.filter(file => file.upstreamSha256 && file.path.startsWith(prefix) && (!suffix || file.path.endsWith(suffix)));
  return { compared: selected.length, identical: selected.filter(file => file.status === 'identical').length, differences: selected.filter(file => file.status !== 'identical').map(file => file.path) };
}
const report = {
  generatedAt: new Date().toISOString(), scope: 'Every copied Bootstrap documentation/framework source file; source-only audit before build/publication',
  upstream: 'Bootstrap 5.3.8 pinned source', status: violations.length ? 'fail' : 'pass',
  summary: { comparedFiles: files.length, upstreamFiles: Object.keys(original).length, identicalFiles: files.filter(file => file.status === 'identical').length, modifiedFiles: files.filter(file => file.status === 'modified').length, addedFiles: files.filter(file => file.status === 'added').length, removedEarlierCustomFiles: files.filter(file => !file.upstreamSha256 && !file.currentSha256).length, restoredFiles: files.filter(file => file.restoredToOriginal).length },
  preserved: { templates: group('site/src/layouts/'), documentationContent: group('site/src/content/'), iconComponents: group('site/src/components/icons/'), frameworkSass: group('scss/'), frameworkJavaScript: group('js/'), documentationJavaScript: group('site/src/assets/', '.js'), nativeSearchStylesheet: files.find(file => file.path === 'site/src/scss/_search.scss')?.status, nativeSearchJavaScript: files.find(file => file.path === 'site/src/assets/search.js')?.status },
  checks: { themeStorageGuardExact, snippetExportSourceExact, versionScopeSourceExact, derivedPreviewCaptureExact, syncedRootTokens, gradientsRetainNativeGeometry, additionalStylesheetDeclarationsReviewed: declarations.length, noAddedLayoutOrShapeProperties: !declarations.some(decl => !decl.colourProperty), nativeSearchShadowGeometry: customShadows, docSearchPaintGeometry },
  infrastructureExceptions: Object.entries(allowed).filter(([name]) => !/Favicons|manifest|_variables|_tq-docs|_tq-tokens/.test(name)).map(([path, reason]) => ({ path, reason })),
  configurationSubstitutions: configChanges, violations, additionalColourDeclarations: declarations, files
};
report.sourcePaintSubstitutions = { manifests: substitutionManifests, checks: paintSubstitutions };
report.derivedPreviewCaptures = { manifest: derivedPreviewManifestPath, manifestSHA256: derivedPreviewManifestBytes ? sha(derivedPreviewManifestBytes) : null, captureScriptSHA256: derivedPreviewManifest?.scriptSHA256 || null, nativeExampleIDs, expectedPNGs: 80, observedPNGs: observedPreviewPaths.length, originalSourcePNGs: originalPreviewPaths.length, originalPreviewSourcesUnchanged, exact: derivedPreviewCaptureExact, checks: derivedPreviewChecks, findings: derivedPreviewFindings };
fs.mkdirSync(path.join(here, '.cache'), { recursive: true });
fs.writeFileSync(path.join(here, '.cache/colour-only-docs-audit.json'), JSON.stringify(report, null, 2));
const modified = files.filter(file => file.status === 'modified' || file.status === 'added');
const md = `# Colour-only Bootstrap documentation source audit\n\nStatus: **${report.status.toUpperCase()}**. This audit compares all ${report.summary.upstreamFiles} pinned upstream source files, plus every earlier or current added source file. No build or publication is asserted.\n\n${report.summary.restoredFiles} previously changed files are restored byte-for-byte. Remaining documentation/example paint substitutions are proved by exact replay from upstream. Literal/alias substitutions preserve every non-colour character; Cover white paint alpha and exact local paint rules are explicitly enumerated contrast exceptions. The chart paint options and theme redraw use separately enumerated exact blocks. Framework Sass/JavaScript and native DocSearch source/styles remain original.\n\n## Remaining differences\n\n${modified.map(file => `- \`${file.path}\`: ${file.disposition}`).join('\n')}\n\n## Geometry and behavior\n\nThe additional stylesheet has ${declarations.length} declarations, all colour properties/variables. Native gradient angles/stops/alpha values and DocSearch focus-shadow geometry are preserved. The ${paintSubstitutions.length} additional source substitution records have exact original-to-current paint proofs. There are no added dimensions, font rules, rounded corners, padding, opacity properties, transforms, animation, text-decoration metrics, borders, layout rules or framework keyboard/behavior scripts. The dashboard-only chart theme listener redraws paint through the original chart API. Root colour tokens are byte-identical. Generated tabindex additions and custom local-search UI are removed.\n\n## Local-preview service exceptions\n\nThe original Ads and Analytics component source and positions are preserved. Only the generated Fathom and Carbon Ads script loader tags are omitted, without replacement UI. Native hosted DocSearch, StackBlitz, third-party examples and original imagery otherwise retain original Bootstrap behavior and network requirements. Original raster/logo artwork is unchanged.\n\n## Limits\n\nThis is source comparison and colour-declaration evidence, not a universal WCAG conformance claim. Existing upstream accessibility behavior is intentionally restored under the user's colour-only direction. Compiled output and rendered geometry require the subsequent build/review.\n\n${violations.length ? `## Findings\n\n${violations.map(value => `- ${value}`).join('\n')}` : 'No unreviewed source differences were found.'}\n`;
const previewMd = `## Gallery preview captures\n\nThe 80 added PNGs are native-sized light-mode captures of the 40 actual TQ example pages, at 480×300 and 960×600 pixels. The source check requires the exact pinned page IDs, both densities, recorded SHA-256 values, PNG signatures and dimensions; it permits no additional preview paths. Capture provenance and per-file proof are recorded in \`${derivedPreviewManifestPath}\`. All 80 original upstream gallery PNG source files remain byte-identical. The derived previews are published by the separate build step; this source audit does not assert publication.\n\n`;
const finalMd = md.replace('Original raster/logo artwork is unchanged.', 'Original logos, photographs and raster source images remain byte-identical. The separately recorded gallery previews show the TQ styling through actual page captures.').replace('## Limits', previewMd + '## Limits');
fs.writeFileSync(path.join(here, '.cache/colour-only-docs-audit.md'), finalMd);
console.log(JSON.stringify({ status: report.status, summary: report.summary, preserved: report.preserved, checks: report.checks, violations }, null, 2));
if (violations.length) process.exitCode = 1;
