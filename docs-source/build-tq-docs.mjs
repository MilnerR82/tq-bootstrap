import { cp, mkdir, readdir, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import {buildDownloads} from '../scripts/build-downloads.mjs';

// Build Bootstrap's original Astro documentation with colour substitutions.
// The framework CSS/JS paths and SRI hashes are local-package infrastructure.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
await cp(path.join(root, 'src/scss/_tokens.scss'), path.join(here, '_tq-tokens.scss'));
await mkdir(path.join(here, 'dist/css'), { recursive: true });
for (const file of (await readdir(path.join(root, 'dist/css'))).filter(name => /^bootstrap.*\.css(?:\.map)?$/.test(name))) {
  await cp(path.join(root, 'dist/css', file), path.join(here, 'dist/css', file));
}
await cp(path.join(root, 'upstream/bootstrap/dist/js'), path.join(here, 'dist/js'), { recursive: true });
await cp(path.join(root, 'dist/tq'), path.join(here, 'dist/tq'), { recursive: true });

const configPath = path.join(here, 'config.yml');
const config = yaml.load(await readFile(configPath, 'utf8'));
for (const key of ['css', 'css_rtl', 'js', 'js_bundle']) {
  const filename = config.cdn[key].replace('/docs/5.3/', '');
  config.cdn[`${key}_hash`] = `sha384-${createHash('sha384').update(await readFile(path.join(here, filename))).digest('base64')}`;
}
await writeFile(configPath, yaml.dump(config, { lineWidth: -1 }));

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(here, 'node_modules/astro/astro.js'), 'build', '--root', 'site'], {
    cwd: here, stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }
  });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Astro exited ${code}`)));
});

// Infrastructure exceptions for local preview: do not send telemetry or load
// an advertising service. Source templates, Ads component and its position are
// original. No replacement UI, tabindex changes or behavior adapters are added.
const omitted = [];
async function omitExternalPreviewServices(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await omitExternalPreviewServices(file);
    else if (item.name.endsWith('.html')) {
      const source = await readFile(file, 'utf8');
      const updated = source.replace(/<script\b[^>]*\bsrc="https:\/\/(?:cdn\.usefathom\.com\/script\.js|cdn\.carbonads\.com\/carbon\.js)[^"]*"[^>]*>[\s\S]*?<\/script>/g, tag => {
        omitted.push({ page: path.relative(path.join(here, 'site/dist'), file).replaceAll('\\', '/'), src: tag.match(/src="([^"]+)"/)?.[1] });
        return '';
      });
      if (updated !== source) await writeFile(file, updated);
    }
  }
}
await omitExternalPreviewServices(path.join(here, 'site/dist'));
// Upstream reference source stays intact. The independently hosted local build
// must never request Bootstrap's own custom domain on deployment.
await rm(path.join(here, 'site/dist/CNAME'), { force: true });
// Keep upstream content intact while repairing five stale cross-references (the sixth reference was replaced by the corrected installation guidance) in
// the generated local website. Only href destinations change; no visible
// content, component markup, style or Bootstrap behaviour is replaced.
const linkRepairs = [
  ['/docs/5.3/migration#improved-markup-for-progress-bars', '/docs/5.3/migration/#progress-bars'],
  ['/docs/5.3/utilities/borders#border-color', '/docs/5.3/utilities/borders/#color'],
  ['/docs/5.3/components/carousel#with-controls', '/docs/5.3/components/carousel/#basic-examples'],
  ['/docs/5.3/utilities/text#opacity', '/docs/5.3/utilities/colors/#opacity'],
  ['/docs/5.3/utilities/borders#border-width', '/docs/5.3/utilities/borders/#width']
];
const navigationRepairs = [];
async function repairLegacyLinks(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) await repairLegacyLinks(filename);
    else if (item.name.endsWith('.html')) {
      const before = await readFile(filename, 'utf8');
      let after = before;
      const substitutions = [];
      for (const [from, to] of linkRepairs) {
        const oldHref = `href="${from}"`;
        const count = after.split(oldHref).length - 1;
        if (count) {
          after = after.replaceAll(oldHref, `href="${to}"`);
          substitutions.push({ from, to, count });
        }
      }
      if (after !== before) {
        await writeFile(filename, after);
        navigationRepairs.push({ page: path.relative(path.join(here, 'site/dist'), filename).replaceAll('\\', '/'), beforeSHA256: createHash('sha256').update(before).digest('hex'), afterSHA256: createHash('sha256').update(after).digest('hex'), substitutions });
      }
    }
  }
}
await repairLegacyLinks(path.join(here, 'site/dist'));
for (const [from] of linkRepairs) {
  const count = navigationRepairs.flatMap(page => page.substitutions).filter(item => item.from === from).reduce((sum, item) => sum + item.count, 0);
  if (count !== 1) throw new Error(`Legacy documentation link coverage changed for ${from}: ${count}`);
}
// Use captured TQ pages at the original gallery URLs/dimensions. Original
// upstream preview sources remain intact; only generated gallery PNGs change.
const previewSource = path.join(here, 'site/static/docs/[version]/example-previews');
const previewNames = (await readdir(previewSource)).sort();
const exampleNames = (await readdir(path.join(here, 'site/src/assets/examples'), { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name);
const expectedPreviews = exampleNames.flatMap(name => [name + '.png', name + '@2x.png']).sort();
if (exampleNames.length !== 40 || JSON.stringify(previewNames) !== JSON.stringify(expectedPreviews)) throw new Error('All80 TQ gallery previews are required');
const previewOutput = path.resolve(here, 'site/dist/docs/' + config.docs_version + '/assets/img/examples');
const rawPreviewOutput = path.resolve(here, 'site/dist/docs/' + config.docs_version + '/example-previews');
const generatedRoot = path.resolve(here, 'site/dist');
if (!previewOutput.startsWith(generatedRoot + path.sep) || !rawPreviewOutput.startsWith(generatedRoot + path.sep)) throw new Error('Gallery preview output escaped generated documentation');
const galleryPreviews = [];
for (const filename of previewNames) {
  const sourceFile = path.join(previewSource, filename);
  const contents = await readFile(sourceFile);
  const expectedWidth = filename.endsWith('@2x.png') ? 960 : 480;
  const expectedHeight = filename.endsWith('@2x.png') ? 600 : 300;
  if (contents.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || contents.readUInt32BE(16) !== expectedWidth || contents.readUInt32BE(20) !== expectedHeight) throw new Error('Invalid TQ preview dimensions: ' + filename);
  await cp(sourceFile, path.join(previewOutput, filename));
  await rm(path.join(rawPreviewOutput, filename));
  galleryPreviews.push({ file: filename, width: expectedWidth, height: expectedHeight, sha256: createHash('sha256').update(contents).digest('hex') });
}
// The source captures belong in the source archive. Serve the gallery only at
// its native URLs, without a duplicate unused public image directory.
await rmdir(rawPreviewOutput);
const downloads = await buildDownloads();
await writeFile(path.join(here, 'site/dist/tq-docs-build.json'), JSON.stringify({
  bootstrap: '5.3.8', template: 'Original Bootstrap 5.3.8 Astro documentation',
  adaptation: 'TAFE Queensland colours with native framework geometry and unchanged Bootstrap JavaScript; separate accessibility companion and explicit documentation corrections recorded in the remediation evidence',
  localInfrastructure: ['Local framework asset/download URLs and SRI', 'Independent distribution/source/example ZIPs survive relocation without recursively embedding the complete release', 'Fathom and Carbon Ads loader scripts omitted; no replacement UI', 'Five remaining stale upstream documentation hrefs target their existing current sections', 'Native version menu is restricted to Bootstrap5.3', 'All80 gallery PNGs are captured from the themed pages at the native sizes and URLs', 'Theme controls tolerate unavailable storage; StackBlitz projects carry their local themed assets'],
  navigationRepairs,
  galleryPreviews,
  downloads,
  search: 'Original native hosted Bootstrap DocSearch', omittedServiceLoaders: omitted.length,
  javascript: 'Unmodified Bootstrap5.3.8 bundle plus separately built TQ accessibility companion for tooltip dismissal/persistence, paused carousels and persistent form feedback; recorded theme-storage and self-contained snippet export repairs', builtAt: new Date().toISOString()
}, null, 2));
console.log('Built original Bootstrap documentation with colour substitutions and documented local-preview infrastructure.');
