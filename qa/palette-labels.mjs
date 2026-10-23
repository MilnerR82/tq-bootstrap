import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import { chromium, firefox, webkit } from 'playwright';
import { verifySubstitutions } from './colour-substitution-proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.TQ_BASE_URL || 'http://127.0.0.1:5198';
const origin = new URL(base).origin;
const pagePath = 'docs/5.3/customize/color/index.html';
const colourData = {
  colors: { blue: '#2f4370', indigo: '#091135', purple: '#6c0162', pink: '#f32a7c', red: '#e31b23', orange: '#ff4904', yellow: '#ff4904', green: '#00766c', teal: '#00a89b', cyan: '#00a89b', white: '#ffffff', gray: '#696567', 'gray-dark': '#373234' },
  grays: { 100: '#f1efed', 200: '#e1ddd8', 300: '#d7d2cb', 400: '#d7d2cb', 500: '#696567', 600: '#696567', 700: '#696567', 800: '#373234', 900: '#373234' },
  'theme-colors': { primary: '#e31b23', secondary: '#696567', success: '#00766c', danger: '#8a0008', warning: '#ff4904', info: '#00a89b', light: '#f1efed', dark: '#091135' }
};
const sourceFiles = ['site/data/colors.yml', 'site/data/grays.yml', 'site/data/theme-colors.yml', 'site/src/content/docs/customize/color.mdx'];
const read = relative => fs.readFile(path.join(root, relative));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalizeHex = value => {
  const hex = value.toLowerCase().replace(/^#/, '');
  return '#' + (hex.length === 3 ? [...hex].map(n => n + n).join('') : hex);
};
const rgb = value => normalizeHex(value).slice(1).match(/../g).map(n => parseInt(n, 16));
const close = (actual, expected) => actual.length === 3 && expected.every((value, i) => Math.abs(actual[i] - value) < .011);
const report = {
  suite: 'Live TQ palette labels and native CSS swatches', started: new Date().toISOString(),
  method: 'Read the published native customize/color page in three browser engines and both modes. Compare every printed base hex label to its actual computed swatch background and independently expected TQ value. Check all family, gray and semantic CSS variables; check every native gray row and all 90 generated tint/shade rows against their independently calculated, native 8-bit CSS-serialized palette values. Exact original-source replay protects names, markup, classes and YAML contrast_color flags. All 120 rendered labels (90 tints/shades, 9 grays, 8 semantic and 13 base swatches) additionally require actual foreground/ancestor-composited background contrast at least 4.5:1 with full-precision WCAG luminance, in all three engines and both modes. The original 933 assertions remain intact; these add 720 minimum-contrast assertions.',
  checks: [], sourceProof: [], findings: [], limitations: ['This audit verifies palette labels and paint consistency. It is not a WCAG or geometry conformance assessment.', 'Native instructional Sass/code excerpts remain upstream source references and are excluded from live-label assertions.']
};
function add(record, pass) { report.checks.push({ ...record, pass }); if (!pass) report.findings.push(record); }
const meetsMinimumLabel=value=>Number.isFinite(value)&&value>=4.5;
report.contrastBoundaryProbes=[
  ['below-4.5-is-not-rounded-up',!meetsMinimumLabel(4.499999999)],
  ['exact-4.5-accepted',meetsMinimumLabel(4.5)],
  ['maximum-21-accepted',meetsMinimumLabel(21)],
  ['nonfinite-measurement-rejected',!meetsMinimumLabel(Infinity)],
  ['nan-measurement-rejected',!meetsMinimumLabel(NaN)],
  ['missing-measurement-rejected',!meetsMinimumLabel(undefined)]
].map(([name,pass])=>({name,pass}));
if(report.contrastBoundaryProbes.some(p=>!p.pass))report.findings.push({target:'minimum-contrast-boundary-probes',error:'A minimum-contrast assertion boundary failed'});
function minimumLabel(info, selector, actual) {
  add({ ...info, target: 'minimum-label-contrast', selector, text: actual.text,
    rawForeground: actual.rawForeground, foreground: actual.foreground,
    background: actual.compositedBackground, contrast: actual.textContrast,
    required: 4.5 }, meetsMinimumLabel(actual.textContrast));
}
async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const name = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(name)); else files.push(name);
  }
  return files;
}
async function fingerprints() {
  const html = String(await read(pagePath));
  const stylesheets = [...html.matchAll(/<link\b[^>]*>/gi)].filter(match => /\brel=["']stylesheet["']/i.test(match[0])).map(match => match[0].match(/\bhref=["']([^"']+)["']/i)?.[1]).filter(Boolean).map(href => new URL(href, base)).filter(url => url.origin === origin).map(url => decodeURIComponent(url.pathname).replace(/^\//, ''));
  if (!stylesheets.length) throw Error('Native colour page has no local stylesheets');
  const files = [...new Set([pagePath, 'src/scss/_tokens.scss', 'docs-source/site/src/scss/_tq-docs.scss', 'qa/results/docs-colour-substitutions.json', 'qa/palette-labels.mjs', 'qa/colour-substitution-proof.mjs', ...sourceFiles.map(file => 'docs-source/' + file), ...await walk('dist/css'), ...stylesheets])];
  return Object.fromEntries(await Promise.all(files.sort().map(async file => [file, hash(await read(file))])));
}
const manifest = JSON.parse(await read('qa/results/docs-colour-substitutions.json'));
for (const relative of sourceFiles) {
  const record = manifest.files.find(file => file.path === relative);
  const original = await read('upstream/bootstrap-source/' + relative), actual = await read('docs-source/' + relative);
  const proof = record ? verifySubstitutions(original, actual, record) : { pass: false, findings: ['Missing manifest record'] };
  report.sourceProof.push({ path: relative, ...proof });
  if (!proof.pass || record.upstreamSha256 !== hash(original) || record.currentSha256 !== hash(actual)) report.findings.push({ target: 'source-proof', path: relative, proof });
}
for (const [name, expected] of Object.entries(colourData)) {
  const records = yaml.load(String(await read('docs-source/site/data/' + name + '.yml')));
  add({ target: 'data-names-and-order', data: name, actual: records.map(row => String(row.name)), expected: Object.keys(expected) }, JSON.stringify(records.map(row => String(row.name))) === JSON.stringify(Object.keys(expected)));
  for (const row of records) add({ target: 'data-hex', data: name, name: String(row.name), actual: row.hex, expected: expected[row.name] }, normalizeHex(row.hex) === expected[row.name]);
}
report.assetsAtStart = await fingerprints();
for (const [browserName, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(base + '/' + pagePath, { waitUntil: 'load' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(async theme => { document.documentElement.dataset.bsTheme = theme; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, theme);
      // Flush the genuine display list before computed-paint measurements.
      await page.screenshot();
      const info = { browser: browserName, theme };
      async function sample(selector, variable) {
        return page.evaluate(({ selector, variable }) => {
          const element = selector ? document.querySelector(selector) : document.documentElement;
          if (!element) return { error: 'Missing element', selector };
          const probe = document.createElement('span');
          probe.style.color = variable ? `var(${variable})` : getComputedStyle(element).backgroundColor;
          probe.hidden = true; element.append(probe);
          const channels = getComputedStyle(probe).color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
          probe.remove();
          const parse=value=>{const values=value.match(/[\d.]+/g)?.map(Number)||[];return values.length>=3?[...values.slice(0,3),values[3]??1]:[0,0,0,0];};
          const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
          const luminance=values=>values.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
          const ancestors=[];for(let node=element;node;node=node.parentElement)ancestors.unshift(node);
          const background=ancestors.reduce((paint,node)=>over(parse(getComputedStyle(node).backgroundColor),paint),[255,255,255,1]);
          const style=getComputedStyle(element),foreground=over(parse(style.color),background),levels=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
          return { text: selector ? element.textContent.trim() : undefined, paint: channels, rawBackground: style.backgroundColor,
            rawForeground:style.color,foreground,compositedBackground:background,textContrast:(levels[0]+.05)/(levels[1]+.05) };
        }, { selector, variable });
      }
      for (const [family, hex] of Object.entries(colourData.colors)) {
        const actual = await sample(null, '--bs-' + family);
        add({ ...info, target: 'family-css-variable', family, actual, expected: hex }, close(actual.paint || [], rgb(hex)));
      }
      for (const [value, hex] of Object.entries(colourData.grays)) {
        for (const [target, selector, variable] of [['gray-css-variable', null, '--bs-gray-' + value], ['gray-row', '.bd-gray-' + value, null]]) {
          const actual = await sample(selector, variable);
          add({ ...info, target, value, actual, expected: hex }, close(actual.paint || [], rgb(hex)) && (target !== 'gray-row' || actual.text === '$gray-' + value));
          if (target === 'gray-row') minimumLabel(info, selector, actual);
        }
      }
      for (const [role, hex] of Object.entries(colourData['theme-colors'])) {
        for (const [target, selector, variable] of [['semantic-css-variable', null, '--bs-' + role], ['semantic-swatch', '.text-bg-' + role + '.rounded-3', null]]) {
          const actual = await sample(selector, variable);
          add({ ...info, target, role, actual, expected: hex }, close(actual.paint || [], rgb(hex)));
          if (target === 'semantic-swatch') minimumLabel(info, selector, actual);
        }
      }
      const printed = Object.entries(colourData.colors).filter(([name]) => !['white', 'gray', 'gray-dark'].includes(name)).map(([name, hex]) => ({ name, hex, selector: '.swatch-' + name }));
      printed.push({ name: 'gray-500', hex: '#696567', selector: '.swatch-gray-500' }, { name: 'black', hex: '#373234', selector: '.bd-black' }, { name: 'white', hex: '#ffffff', selector: '.bd-white' });
      for (const { name, hex, selector } of printed) {
        const actual = await sample(selector);
        const label = actual.text?.match(/#[a-f\d]{3}(?:[a-f\d]{3})?\b/i)?.[0];
        add({ ...info, target: 'printed-base-hex', name, selector, label, actual, expected: hex }, Boolean(label) && normalizeHex(label) === hex && close(actual.paint || [], rgb(hex)));
        minimumLabel(info, selector, actual);
      }
      for (const [family, hex] of Object.entries(colourData.colors).filter(([name]) => !['white', 'gray', 'gray-dark'].includes(name))) {
        for (let value = 100; value <= 900; value += 100) {
          const weight = Math.abs(500 - value) / 500, blend = value < 500 ? 255 : 0;
          const expected = rgb(hex).map(channel => Math.round(channel * (1 - weight) + blend * weight));
          const actual = await sample('.bd-' + family + '-' + value);
          add({ ...info, target: 'named-tint-shade', family, value, actual, expected }, close(actual.paint || [], expected) && actual.text === '$' + family + '-' + value);
          minimumLabel(info, '.bd-' + family + '-' + value, actual);
        }
      }
      console.log(browserName + ': checked live palette labels and colour rows in ' + theme);
    }
  } catch (error) { report.findings.push({ browser: browserName, error: error.message }); }
  finally { await browser.close(); }
}
report.assetsAtEnd = await fingerprints();
const assetsFrozen = JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd);
if (!assetsFrozen) report.findings.push({ target: 'assets', error: 'Inputs changed during label audit' });
const expectedContrastSelectors=[
  ...['blue','indigo','purple','pink','red','orange','yellow','green','teal','cyan'].flatMap(family=>Array.from({length:9},(_,index)=>'.bd-'+family+'-'+((index+1)*100))),
  ...Array.from({length:9},(_,index)=>'.bd-gray-'+((index+1)*100)),
  ...['primary','secondary','success','danger','warning','info','light','dark'].map(role=>'.text-bg-'+role+'.rounded-3'),
  ...['blue','indigo','purple','pink','red','orange','yellow','green','teal','cyan','gray-500'].map(name=>'.swatch-'+name),'.bd-black','.bd-white'
].sort();
report.minimumContrastMatrix=['chromium','firefox','webkit'].flatMap(browser=>['light','dark'].map(theme=>{
  const measured=report.checks.filter(c=>c.target==='minimum-label-contrast'&&c.browser===browser&&c.theme===theme),selectors=measured.map(c=>c.selector).sort();
  return{browser,theme,expected:120,actual:measured.length,unique:new Set(selectors).size,missing:expectedContrastSelectors.filter(s=>!selectors.includes(s)),extra:selectors.filter(s=>!expectedContrastSelectors.includes(s)),pass:JSON.stringify(selectors)===JSON.stringify(expectedContrastSelectors)};
}));
if(report.minimumContrastMatrix.some(row=>!row.pass))report.findings.push({target:'minimum-label-contrast-matrix',error:'Incomplete or duplicate actual label/mode/browser coverage',matrix:report.minimumContrastMatrix});
report.finished = new Date().toISOString();
report.summary = { sourceProofFiles: report.sourceProof.length, sourceProofFailures: report.sourceProof.filter(row => !row.pass).length, checks: report.checks.length, passed: report.checks.filter(row => row.pass).length, failed: report.findings.length, findings: report.findings.length, printedHexChecks: report.checks.filter(row => row.target === 'printed-base-hex').length, originalChecks: report.checks.filter(row => row.target !== 'minimum-label-contrast').length, minimumContrastChecks: report.checks.filter(row => row.target === 'minimum-label-contrast').length, minimumContrastFailures: report.checks.filter(row => row.target === 'minimum-label-contrast' && !row.pass).length, minimumContrastMatrixPass: report.minimumContrastMatrix.every(row => row.pass), contrastBoundaryProbes: report.contrastBoundaryProbes.length, contrastBoundaryProbeFailures: report.contrastBoundaryProbes.filter(row => !row.pass).length, minimumTextContrast: Math.min(...report.checks.filter(row => row.target === 'minimum-label-contrast').map(row => row.contrast)), assetsFrozen };
await fs.writeFile(path.join(root, 'qa/results/palette-labels.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.findings.length) process.exitCode = 1;
