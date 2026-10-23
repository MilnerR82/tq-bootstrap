import {mkdir,readFile,writeFile,access,readdir} from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import archiver from 'archiver';
import {parseDocument,DomUtils} from 'htmlparser2';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
process.chdir(root);
const docsOutput='docs-source/site/dist';
await access(path.join(docsOutput,'index.html'));
await access(path.join(docsOutput,'docs/5.3/components/buttons/index.html'));
await access('dist/css/bootstrap.min.css');
await access('dist/js/bootstrap.bundle.min.js');
for(const file of await readdir('dist/js'))if(/^tq-/.test(file))throw new Error('Custom JavaScript is outside the Bootstrap-only release: '+file);
for(const file of await readdir('dist/css'))if(/^tq-/.test(file))throw new Error('Distribution CSS must use the standard Bootstrap filename: '+file);
async function listFiles(directory,prefix=''){
 const files=[];
 for(const entry of await readdir(path.join(directory,prefix),{withFileTypes:true})){
  const relative=path.join(prefix,entry.name);
  if(entry.isDirectory())files.push(...await listFiles(directory,relative));
  else files.push(relative.replaceAll('\\','/'));
 }
 return files.sort();
}
const inventories=[];
async function verifyInventory(label,original,current,{compareBytes=true,ignorePlugins=false}={}){
 const expected=await listFiles(original);
 const found=(await listFiles(current)).filter(file=>!ignorePlugins||!file.startsWith('plugins/'));
 const missing=expected.filter(file=>!found.includes(file));
 const extra=found.filter(file=>!expected.includes(file));
 const changed=[];
 if(compareBytes)for(const file of expected.filter(file=>!missing.includes(file))){
  const [a,b]=await Promise.all([readFile(path.join(original,file)),readFile(path.join(current,file))]);
  if(!a.equals(b))changed.push(file);
 }
 if(missing.length||extra.length||changed.length)throw new Error(label+' inventory mismatch: '+JSON.stringify({missing,extra,changed}));
 inventories.push({label,files:expected.length,original,current,verification:compareBytes?'byte-identical':'same complete filenames; CSS colour values are themed'});
}
await verifyInventory('Bootstrap CSS distributions','upstream/bootstrap/dist/css','dist/css',{compareBytes:false});
await verifyInventory('Published themed CSS matches the audited framework','dist/css','docs/5.3/dist/css');
await verifyInventory('Bootstrap JavaScript distributions','upstream/bootstrap/dist/js','dist/js',{ignorePlugins:true});
await verifyInventory('Bootstrap individual JavaScript modules','upstream/bootstrap/js','dist/js/plugins');
await verifyInventory('Bootstrap Icons','upstream/bootstrap-icons','assets/bootstrap-icons');
const evidenceFiles=['qa/results/colour-only-parity.json','qa/results/colour-only-rendered.json','qa/results/colour-only-docs-source.json','qa/results/colour-only-docs-parity.json','qa/results/colour-only-examples.json','qa/results/example-colour-substitutions.json','qa/results/docs-colour-substitutions.json','qa/results/example-contrast.json','qa/results/example-contrast-initial.json','qa/results/example-contrast-tick-regression.json','qa/results/example-contrast-tooltip-timing.json','qa/results/example-contrast-pre-sidebar-cover.json','qa/results/example-contrast-pre-core-role.json','qa/results/example-contrast-chart-wait-timeout.json','qa/results/colour-only-examples-initial.json','qa/results/colour-only-examples-pre-scale.json','qa/results/inline-svg-colour-substitutions.json','qa/results/prefix-default-css-equivalence.json','qa/results/sass-customisation.json','qa/results/sass-customisation-before-prefix.json','qa/results/font-stability.json','qa/results/colour-only-examples-font-settle-diagnostic.json','qa/results/example-contrast-chart-wait-timeout-repeat.json','qa/results/chart-theme-paint-diagnostic.json','qa/results/chart-theme-paint-baseline.json','qa/results/chart-theme-paint-fix-proof.json'];
evidenceFiles.push('qa/results/palette-contrast.json','qa/results/palette-contrast-initial.json','qa/results/example-contrast-pre-expanded-palette.json','qa/results/example-contrast-expanded-initial.json','qa/results/palette-labels.json','qa/results/palette-labels-initial.json');
evidenceFiles.push('qa/results/standalone-functionality.json','qa/results/docs-functionality.json','qa/results/snippet-export.json','qa/results/example-links.json','qa/results/example-links-initial.json','qa/results/theme-storage-initial.json');
evidenceFiles.push('qa/results/docs-nested-functionality.json');
evidenceFiles.push('qa/results/version-scope.json','qa/results/example-previews.json');
evidenceFiles.push('qa/results/version-scope-initial.json','qa/results/docs-functionality-initial.json','qa/results/docs-nested-functionality-initial.json');
const [compiled,rendered,docsSource,docsCSS,examples]=await Promise.all(evidenceFiles.map(async file=>JSON.parse(await readFile(file,'utf8'))));
const versionScope=JSON.parse(await readFile('qa/results/version-scope.json','utf8'));
if(versionScope.summary?.menus!==112||versionScope.summary.runtimeVisits!==24||versionScope.summary.checks!==184||versionScope.summary.passed!==184||versionScope.summary.failed!==0||versionScope.summary.assetsFrozen!==true||versionScope.files.length!==112||versionScope.checks.length!==184||versionScope.findings.length||versionScope.checks.some(row=>row.pass!==true))throw new Error('Every native header and all24 browser/width visits must pass the Bootstrap5.3-only version review.');
const versionFiles=new Map(versionScope.files.map(row=>[row.file,row]));
if(versionFiles.size!==112)throw new Error('Repeated version-menu proof file.');
for(const file of versionFiles.keys())if(versionScope.checks.filter(row=>row.file===file&&row.name==='Only the requested version-menu subtree changed').length!==1)throw new Error('Missing/repeated static version assertion: '+file);
for(const browser of ['chromium','firefox','webkit'])for(const width of [390,1440])for(const route of ['/','/docs/5.3/examples/','/docs/5.3/getting-started/accessibility/','/docs/5.3/components/buttons/'])for(const name of ['Menu offers only local Bootstrap 5.3','Native version dropdown keyboard and focus return','Version menu has no page errors'])if(versionScope.checks.filter(row=>row.browser===browser&&row.width===width&&row.route===route&&row.name===name).length!==1)throw new Error('Missing/repeated version-menu runtime case: '+JSON.stringify({browser,width,route,name}));
for(const record of versionScope.files){
 const body=await readFile(record.file,'utf8'),document=parseDocument(body,{withStartIndices:true,withEndIndices:true});
 const candidates=DomUtils.findAll(el=>el.name==='li'&&(el.attribs?.class||'').split(/\s+/).includes('nav-item')&&(el.attribs?.class||'').split(/\s+/).includes('dropdown'),document.children).filter(el=>{const button=el.children.find(child=>child.name==='button');return button&&/Bootstrap[\s\u00a0]*v5\.3/.test(DomUtils.textContent(button));});
 if(candidates.length!==1||!['pass','onlyVersionNodeChanged','buttonPass','linkPass','headingPass','structurePass'].every(key=>record[key]===true))throw new Error('Invalid exact native version-menu revision proof: '+record.file);
 const node=candidates[0],before=body.slice(0,node.startIndex)+record.beforeNode+body.slice(node.endIndex+1);
 if(createHash('sha256').update(body).digest('hex')!==record.afterSHA256||createHash('sha256').update(before).digest('hex')!==record.beforeSHA256)throw new Error('Version-menu original/current reconstruction mismatch: '+record.file);
}
const compiledSummary=compiled.summary||{};
if(compiledSummary.distributions!==16||compiledSummary.passedDistributions!==16||compiledSummary.failedDistributions!==0||compiledSummary.nonColourFindings!==0||compiledSummary.javascriptFiles!==92||compiledSummary.javascriptFailures!==0)throw new Error('Colour-only compiled parity audit must pass all 16 CSS distributions and 92 original JavaScript files with zero unresolved findings.');
if(!Array.isArray(compiled.distributions)||compiled.distributions.length!==16||compiled.distributions.some(entry=>entry.pass!==true||!Array.isArray(entry.findings)||entry.findings.length))throw new Error('Compiled parity report contains unresolved non-colour CSS findings.');
if(compiledSummary.publishedDistributions!==16||compiledSummary.publishedPassed!==16||compiledSummary.publishedFailed!==0||compiledSummary.publishedNonColourFindings!==0)throw new Error('Official published Bootstrap CSS parity must pass all 16 distributions with zero unresolved non-colour findings.');
if(!Array.isArray(compiled.officialPublished)||compiled.officialPublished.length!==16||compiled.officialPublished.some(entry=>entry.pass!==true||!Array.isArray(entry.findings)||entry.findings.length||entry.expectedRules!==entry.actualRules||entry.expectedDeclarations!==entry.actualDeclarations||entry.expectedPaintMaskedSHA256!==entry.actualPaintMaskedSHA256||entry.sourceFile!=='upstream/bootstrap/dist/css/'+entry.file))throw new Error('Official published Bootstrap comparison contains unresolved CSS surface or non-colour findings.');
const cssDistributionNames=(await listFiles('upstream/bootstrap/dist/css')).filter(file=>file.endsWith('.css'));
for(const [label,entries]of [['native',compiled.distributions],['official published',compiled.officialPublished]])if(JSON.stringify(entries.map(entry=>entry.file).sort())!==JSON.stringify(cssDistributionNames))throw new Error('The '+label+' parity report does not cover every original CSS distribution exactly once.');
if(!Array.isArray(compiled.javascript)||compiled.javascript.length!==92||compiled.javascript.some(entry=>entry.pass!==true||entry.actualSHA256!==entry.expectedSHA256))throw new Error('Compiled parity report contains changed or missing original JavaScript.');
async function verifyFingerprints(fingerprints,label){
 if(!fingerprints||typeof fingerprints!=='object'||Array.isArray(fingerprints)||!Object.keys(fingerprints).length)throw new Error(label+' must contain asset fingerprints.');
 for(const [relative,expected]of Object.entries(fingerprints)){
  if(typeof expected!=='string'||!/^[a-f\d]{64}$/i.test(expected))throw new Error(label+' has an invalid SHA-256 for '+relative);
  const target=path.resolve(root,relative.replace(/^\/+/,''));
  if(!target.startsWith(root+path.sep))throw new Error(label+' asset is outside the package workspace: '+relative);
  const actual=createHash('sha256').update(await readFile(target)).digest('hex');
  const publishedRelative=relative.replace(/^\/+/, '').replaceAll('\\','/');
  // The two raw standalone suites never visit the recursively inventoried
  // gallery. Preserve their observed hashes; accept only its independently
  // proved, separately exercised version-menu subtree revision.
  const revision=publishedRelative==='docs/5.3/examples/index.html'&&/^(Standalone functionality (start|end) evidence|Example rendered (start|end) evidence)$/.test(label)?versionFiles.get(publishedRelative):null;
  if(actual!==expected.toLowerCase()&&!(revision?.beforeSHA256===expected.toLowerCase()&&revision.afterSHA256===actual))throw new Error(label+' is stale for '+relative+'; repeat the colour-only audit before packaging.');
  if(publishedRelative.startsWith('docs/5.3/')){
   const packaged=createHash('sha256').update(await readFile(path.join(docsOutput,publishedRelative))).digest('hex');
   if(packaged!==actual)throw new Error('Compiled documentation differs from the audited published asset '+relative+'; rebuild/publish and repeat the audit.');
  }
 }
}
await verifyFingerprints(versionScope.assetsAtStart,'Version-menu start evidence');
await verifyFingerprints(versionScope.assetsAtEnd,'Version-menu end evidence');
if(JSON.stringify(versionScope.assetsAtStart)!==JSON.stringify(versionScope.assetsAtEnd))throw new Error('Version menu inputs changed during review.');
await verifyFingerprints(Object.fromEntries(compiled.distributions.map(entry=>['dist/css/'+entry.file,entry.actualSHA256])),'Compiled CSS evidence');
await verifyFingerprints(Object.fromEntries(compiled.officialPublished.map(entry=>['dist/css/'+entry.file,entry.actualSHA256])),'Official-published comparison current CSS evidence');
await verifyFingerprints(Object.fromEntries(compiled.officialPublished.map(entry=>[entry.sourceFile,entry.expectedSHA256])),'Official published Bootstrap reference evidence');
await verifyFingerprints(Object.fromEntries(compiled.javascript.map(entry=>[entry.file,entry.actualSHA256])),'Original JavaScript evidence');
if(compiled.summary.paintBoundaryProbes!==20||compiled.summary.paintBoundaryProbeFailures!==0||compiled.summary.paintOnlyOverlaySourcePass!==true||compiled.summary.overlayDistributionFailures!==0||compiled.paintOnlyOverlay?.applied!==true||compiled.paintOnlyOverlay?.pass!==true)throw new Error('The exact semantic validation paint-only overlay and all strict paint-boundary probes must pass.');
await verifyFingerprints(compiled.sourceFingerprints,'Compiled theme source and audit evidence');
const renderedSummary=rendered.summary||{};
if(!Number.isSafeInteger(renderedSummary.checks)||renderedSummary.checks<1||renderedSummary.passed!==renderedSummary.checks||renderedSummary.failed!==0||renderedSummary.geometryMismatches!==0)throw new Error('Rendered colour-only audit must pass with zero unresolved checks and zero geometry mismatches.');
await verifyFingerprints(rendered.assetsAtStart,'Rendered start evidence');
await verifyFingerprints(rendered.assetsAtEnd,'Rendered end evidence');
const orderedFingerprintEntries=map=>JSON.stringify(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)));
if(orderedFingerprintEntries(rendered.assetsAtStart)!==orderedFingerprintEntries(rendered.assetsAtEnd))throw new Error('Rendered audit assets changed during evaluation; repeat the audit on the frozen build.');
const renderedProvenanceFiles=rendered.consolidation?['qa/results/colour-only-rendered-initial.json','qa/results/colour-only-rendered-offcanvas-reproduced.json','qa/results/colour-only-rendered-offcanvas-recheck.json']:[];
const renderedProvenance=rendered.consolidation?[rendered.consolidation.initialReport,rendered.consolidation.focusedReproduction,rendered.consolidation.focusedRecheck]:[];
if(renderedProvenance.some((record,index)=>!record||'qa/results/'+record.file!==renderedProvenanceFiles[index]))throw new Error('Rendered consolidation must identify its preserved initial, reproduction and recheck evidence.');
if(!rendered.consolidation&&(renderedSummary.families!==78||renderedSummary.nativeLiveExamples!==598||renderedSummary.checks!==2274))throw new Error('Fresh rendered audit must cover all 78 documentation families, 598 live examples and 2,274 responsive/state comparisons.');
if(!rendered.consolidation)await verifyFingerprints(Object.fromEntries(rendered.coverage.map(entry=>[entry.source,entry.sourceSHA256])),'Rendered documentation page evidence');
const parallelProvenanceFiles=[];
if(rendered.parallelRuns){
 const records=rendered.parallelRuns.reports;
 if(!Array.isArray(records)||records.length<2)throw new Error('Parallel rendered audit must identify all original raw runs.');
 await verifyFingerprints(Object.fromEntries(records.map(record=>[record.file,record.sha256])),'Parallel rendered measurement provenance');
 const runs=await Promise.all(records.map(async record=>JSON.parse(await readFile(record.file,'utf8'))));
 const ids=new Set(),keys=new Set();
 for(const run of runs){
  if(!run.finished||run.parallelRuns||run.consolidation||run.postBuildColourRecheck||run.summary.failed!==0||run.summary.geometryMismatches!==0||run.summary.assetsFrozen!==true||run.checks.some(row=>row.pass!==true))throw new Error('Parallel provenance must contain only complete passing original measurements.');
  for(const map of [run.assetsAtStart,run.assetsAtEnd])if(orderedFingerprintEntries(map)!==orderedFingerprintEntries(rendered.assetsAtStart))throw new Error('Assets differ across parallel rendered runs.');
  for(const row of run.coverage){if(ids.has(row.id))throw new Error('Overlapping parallel documentation coverage.');ids.add(row.id);}
  for(const row of run.checks){const key=JSON.stringify([row.browser,row.id,row.width,row.theme,row.dir,row.state]);if(keys.has(key))throw new Error('Repeated parallel rendered case.');keys.add(key);}
 }
 if(JSON.stringify(runs.flatMap(run=>run.checks))!==JSON.stringify(rendered.checks)||JSON.stringify(runs.flatMap(run=>run.coverage))!==JSON.stringify(rendered.coverage)||JSON.stringify(runs.flatMap(run=>run.screenshots))!==JSON.stringify(rendered.screenshots))throw new Error('Combined rendered evidence must retain every original measured row verbatim.');
 if(ids.size!==78||keys.size!==2274)throw new Error('Parallel raw measurements do not cover the complete matrix.');
 parallelProvenanceFiles.push(...records.map(record=>record.file));
}
if(rendered.postBuildColourRecheck){
 const patch=rendered.postBuildColourRecheck;
 if(patch.family!=='components-breadcrumb'||patch.replacedChecks!==28)throw new Error('Unexpected isolated documentation paint recheck.');
 await verifyFingerprints(Object.fromEntries([patch.baseReport,patch.recheckReport,patch.sourceManifest].map(record=>[record.file,record.sha256])),'Isolated inline SVG source/recheck provenance');
 const [baseRun,patchRun]=await Promise.all([patch.baseReport,patch.recheckReport].map(async record=>JSON.parse(await readFile(record.file,'utf8'))));
 const caseKey=record=>JSON.stringify([record.browser,record.id,record.width,record.theme,record.dir,record.state]);
 const changed=new Map(patchRun.checks.map(record=>[caseKey(record),record]));
 if(baseRun.summary.checks!==2274||patchRun.summary.checks!==28||changed.size!==28||patchRun.checks.some(record=>record.id!==patch.family||record.pass!==true))throw new Error('Isolated SVG recheck must retain the complete changed-family matrix.');
 const recomposed=baseRun.checks.map(record=>record.id===patch.family?changed.get(caseKey(record)):record);
 const recomposedCoverage=baseRun.coverage.map(record=>record.id===patch.family?patchRun.coverage[0]:record);
 if(JSON.stringify(recomposed)!==JSON.stringify(rendered.checks)||JSON.stringify(recomposedCoverage)!==JSON.stringify(rendered.coverage))throw new Error('Consolidated rendered report differs from its exact original and rechecked measurements.');
 for(const map of [baseRun.assetsAtStart,baseRun.assetsAtEnd,patchRun.assetsAtStart,patchRun.assetsAtEnd])if(orderedFingerprintEntries(map)!==orderedFingerprintEntries(rendered.assetsAtStart))throw new Error('Shared assets changed across the isolated SVG source recheck.');
}
if(renderedProvenance.length)await verifyFingerprints(Object.fromEntries(renderedProvenance.map(record=>['qa/results/'+record.file,record.sha256])),'Rendered consolidation provenance');
if(docsSource.status!=='pass'||!Array.isArray(docsSource.violations)||docsSource.violations.length||!Array.isArray(docsSource.files)||!docsSource.files.length)throw new Error('Documentation source audit must pass with zero unresolved violations and a complete file inventory.');
const docsSourceFingerprints={};
for(const file of docsSource.files){
 if(typeof file.path!=='string'||!file.path)throw new Error('Documentation source audit has an invalid file path.');
 if(file.currentSha256===null){
  try{await access(path.join('docs-source',file.path));}catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw new Error('A removed documentation source file reappeared after the audit: '+file.path);
 }
 docsSourceFingerprints['docs-source/'+file.path]=file.currentSha256;
}
await verifyFingerprints(docsSourceFingerprints,'Documentation source evidence');
await verifyFingerprints(Object.fromEntries(docsSource.sourcePaintSubstitutions.manifests.map(record=>[record.path,record.sha256])),'Documentation paint-substitution manifests');
const docsCSSSummary=docsCSS.summary||{};
if(!Number.isSafeInteger(docsCSSSummary.checks)||docsCSSSummary.checks<1||docsCSSSummary.passed!==docsCSSSummary.checks||docsCSSSummary.failed!==0||docsCSSSummary.nonColourFindings!==0||!Array.isArray(docsCSS.findings)||docsCSS.findings.length)throw new Error('Documentation stylesheet parity audit must pass with zero unresolved non-colour findings.');
await verifyFingerprints(docsCSS.sourceFingerprints||docsCSS.assetsAtStart,'Documentation stylesheet source evidence');
if(docsCSS.assetsAtEnd){
 await verifyFingerprints(docsCSS.assetsAtEnd,'Documentation stylesheet end evidence');
 if(orderedFingerprintEntries(docsCSS.assetsAtStart)!==orderedFingerprintEntries(docsCSS.assetsAtEnd))throw new Error('Documentation stylesheet inputs changed during evaluation; repeat its audit.');
}
const exampleSummary=examples.summary||{};
if(exampleSummary.rendered!==true||exampleSummary.sourceFiles!==82||exampleSummary.manifestFailures!==0||exampleSummary.nonPalettePaintOccurrences!==0||exampleSummary.failed!==0||exampleSummary.findings!==0||exampleSummary.geometryMismatches!==0||exampleSummary.assetsFrozen!==true||exampleSummary.checks!==290||!Array.isArray(examples.findings)||examples.findings.length)throw new Error('All 290 example source, palette, contrast and rendered parity comparisons must pass before packaging.');
if(exampleSummary.contrastFailures!==0||exampleSummary.chartPaintFailures!==0||!Number.isSafeInteger(exampleSummary.contrastChecks)||exampleSummary.contrastChecks<1||!Number.isSafeInteger(exampleSummary.chartPaintChecks)||exampleSummary.chartPaintChecks<1||examples.checks.some(record=>record.pass!==true))throw new Error('Every measured example geometry, contrast and drawn-chart paint check must pass.');
if(examples.checks.length!==exampleSummary.checks||exampleSummary.passed!==exampleSummary.checks||!Array.isArray(examples.contrast)||examples.contrast.length!==exampleSummary.contrastChecks||examples.contrast.some(record=>record.pass!==true)||!Array.isArray(examples.chartPaint)||examples.chartPaint.length!==exampleSummary.chartPaintChecks||examples.chartPaint.some(record=>record.pass!==true))throw new Error('Example audit summary must match every passing geometry, contrast and chart-paint row.');
if(exampleSummary.contrastChecks!==1420||exampleSummary.chartPaintChecks!==120)throw new Error('Examples must include all 1,420 selected contrast and 120 actual canvas-paint checks.');
for(const browser of ['chromium','firefox','webkit'])for(const page of ['dashboard','dashboard-rtl'])for(const width of [390,1440])for(const theme of ['light','dark'])for(const switchedTo of ['light','dark'])if(!examples.chartPaint.some(row=>row.browser===browser&&row.page===page&&row.width===width&&row.theme===theme&&row.state==='theme-during-native-tooltip-close'&&row.switchedTo===switchedTo&&row.closing?.opacityAnimationActive===true&&row.closing.animatorRunning===true&&row.geometryPass===true&&row.pass===true))throw new Error('Missing actual dashboard theme repaint during native tooltip animation: '+JSON.stringify({browser,page,width,theme,switchedTo}));
const exampleIds=examples.source.filter(record=>record.file.endsWith('/index.astro')).map(record=>record.file.split('/').at(-2));
if(exampleIds.length!==40)throw new Error('Every original standalone example page must be inventoried.');
for(const [browser,ids]of [['chromium',exampleIds],['firefox',exampleIds.filter(id=>/^(?:carousel(?:-rtl)?|dashboard(?:-rtl)?|grid|cheatsheet(?:-rtl)?|offcanvas-navbar)$/.test(id))],['webkit',exampleIds.filter(id=>/^(?:carousel(?:-rtl)?|dashboard(?:-rtl)?|grid|cheatsheet(?:-rtl)?|offcanvas-navbar)$/.test(id))]])for(const id of ids)for(const width of [390,1440])for(const theme of ['light','dark'])if(!examples.checks.some(record=>record.browser===browser&&record.page===id&&record.width===width&&record.theme===theme&&record.state==='rest'&&record.pass===true))throw new Error('Missing complete standalone example rendered coverage: '+JSON.stringify({browser,id,width,theme}));
await verifyFingerprints(examples.sourceFingerprints,'Example source audit evidence');
await verifyFingerprints(examples.manifests,'Example substitution manifests');
await verifyFingerprints(examples.assetsAtStart,'Example rendered start evidence');
await verifyFingerprints(examples.assetsAtEnd,'Example rendered end evidence');
if(orderedFingerprintEntries(examples.assetsAtStart)!==orderedFingerprintEntries(examples.assetsAtEnd))throw new Error('Example rendered assets changed during evaluation.');
const contrastReport=JSON.parse(await readFile('qa/results/example-contrast.json','utf8'));
const contrastSummary=contrastReport.summary||{};
if(contrastSummary.checks!==1440||contrastSummary.passed!==contrastSummary.checks||contrastSummary.failed!==0||contrastSummary.findings!==0||contrastSummary.assetsFrozen!==true||!['chromium','firefox','webkit'].every(name=>contrastSummary.browsers?.includes(name))||!Array.isArray(contrastReport.findings)||contrastReport.findings.length)throw new Error('All 1,440 changed-paint contrast checks must pass in all three browser engines before packaging.');
if(!Array.isArray(contrastReport.checks)||contrastReport.checks.length!==contrastSummary.checks||contrastReport.checks.some(record=>record.pass!==true))throw new Error('Contrast audit summary must match every passing measured row.');
for(const browser of ['chromium','firefox','webkit'])for(const theme of ['light','dark'])if(contrastReport.checks.filter(record=>record.browser===browser&&record.theme===theme&&record.pass===true).length!==(theme==='light'?250:230))throw new Error('Contrast audit is missing complete measured coverage for '+browser+' '+theme);
await verifyFingerprints(contrastReport.assetsAtStart,'Contrast rendered start evidence');
await verifyFingerprints(contrastReport.assetsAtEnd,'Contrast rendered end evidence');
if(orderedFingerprintEntries(contrastReport.assetsAtStart)!==orderedFingerprintEntries(contrastReport.assetsAtEnd))throw new Error('Contrast audit assets changed during evaluation.');
await verifyFingerprints(Object.fromEntries(contrastReport.previousAttempts.map(record=>[record.file,record.sha256])),'Preserved contrast audit history');
const paletteReport=JSON.parse(await readFile('qa/results/palette-contrast.json','utf8'));
const paletteSummary=paletteReport.summary||{};
if(paletteSummary.checks!==1032||paletteSummary.passed!==1032||paletteSummary.failed!==0||paletteSummary.findings!==0||paletteSummary.contrastChecks!==888||paletteSummary.expectedPaintChecks!==144||paletteSummary.documentedInappropriateContexts!==30||paletteSummary.assetsFrozen!==true||paletteReport.checks.length!==1032||paletteReport.checks.some(row=>row.pass!==true)||paletteReport.findings.length)throw new Error('Expanded semantic palette must pass all 1,032 actual-paint/contrast measurements.');
if(paletteReport.checks.filter(row=>row.threshold===4.5).length!==660||paletteReport.checks.filter(row=>row.threshold===3).length!==228||paletteReport.checks.filter(row=>typeof row.contrast==='number').some(row=>row.contrast<row.threshold))throw new Error('Palette text/glyph thresholds and complete measured coverage must remain intact.');
for(const browser of ['chromium','firefox','webkit'])for(const theme of ['light','dark'])if(paletteReport.checks.filter(row=>row.browser===browser&&row.theme===theme).length!==172)throw new Error('Expanded semantic palette is missing a complete browser/mode matrix.');
if(paletteReport.documentedContextLimits.length!==30)throw new Error('Palette report must retain every measured inappropriate outline/body context separately.');
await verifyFingerprints(paletteReport.assetsAtStart,'Expanded palette start evidence');
await verifyFingerprints(paletteReport.assetsAtEnd,'Expanded palette end evidence');
if(orderedFingerprintEntries(paletteReport.assetsAtStart)!==orderedFingerprintEntries(paletteReport.assetsAtEnd))throw new Error('Palette audit inputs changed during measurement.');
const labelsReport=JSON.parse(await readFile('qa/results/palette-labels.json','utf8'));
if(labelsReport.summary?.checks!==933||labelsReport.summary.passed!==933||labelsReport.summary.failed!==0||labelsReport.summary.findings!==0||labelsReport.summary.sourceProofFiles!==4||labelsReport.summary.sourceProofFailures!==0||labelsReport.summary.printedHexChecks!==78||labelsReport.summary.assetsFrozen!==true||labelsReport.checks.length!==933||labelsReport.checks.some(row=>row.pass!==true)||labelsReport.sourceProof.length!==4||labelsReport.sourceProof.some(row=>row.pass!==true)||labelsReport.findings.length)throw new Error('All live palette labels, named colour scales and exact data-source proofs must pass.');
for(const browser of ['chromium','firefox','webkit'])for(const theme of ['light','dark'])if(labelsReport.checks.filter(row=>row.browser===browser&&row.theme===theme).length!==150||labelsReport.checks.filter(row=>row.browser===browser&&row.theme===theme&&row.target==='printed-base-hex').length!==13)throw new Error('Live palette label audit is missing complete browser/mode coverage.');
await verifyFingerprints(labelsReport.assetsAtStart,'Live palette labels start evidence');
await verifyFingerprints(labelsReport.assetsAtEnd,'Live palette labels end evidence');
if(orderedFingerprintEntries(labelsReport.assetsAtStart)!==orderedFingerprintEntries(labelsReport.assetsAtEnd))throw new Error('Live palette label inputs changed during measurement.');
// prefix-default-css-equivalence.json is preserved historical evidence for the
// earlier prefix repair. This deliberate palette revision changes CSS paint;
// the fresh rendered matrix and Sass audit below bind the current distribution.
const sassReport=JSON.parse(await readFile('qa/results/sass-customisation.json','utf8'));
const sassSummary=sassReport.summary||{};
if(sassSummary.sourceCases!==5||sassSummary.sourceFailures!==0||sassSummary.customShadowCases!==12||sassSummary.customShadowFailures!==0||sassSummary.runtimeChecks!==270||sassSummary.runtimeFailures!==0||sassSummary.defaultDistributionMatchesSource!==true||sassSummary.sourcesFrozen!==true)throw new Error('Sass prefix/custom-focus audit must pass all five source cases, twelve shadow cases and 270 browser checks.');
if(sassSummary.boundaryProbes!==2||sassSummary.boundaryProbeFailures!==0||sassReport.boundaryProbes.some(row=>row.pass!==true))throw new Error('The Sass negative probe must reject a hardcoded default body-colour reference in a custom-prefix build.');
if(sassReport.source.length!==5||sassReport.runtime.length!==270||sassReport.customShadows.length!==12||[...sassReport.source,...sassReport.runtime,...sassReport.customShadows].some(row=>row.pass!==true)||sassReport.source.some(row=>row.findings.length||row.foreignInventoryMatchesNative!==true||JSON.stringify([...row.foreignVariables].sort())!==JSON.stringify([...row.nativeForeignVariables].sort())||row.addedForeignVariables.length||row.missingNativeForeignVariables.length||row.addedUndeclaredReferences.length))throw new Error('Sass audit summary must match the complete passing measured source/runtime rows, retaining the exact native private variable inventory.');
await verifyFingerprints(sassReport.sourceAtStart,'Sass customisation start evidence');
await verifyFingerprints(sassReport.sourceAtEnd,'Sass customisation end evidence');
if(orderedFingerprintEntries(sassReport.sourceAtStart)!==orderedFingerprintEntries(sassReport.sourceAtEnd))throw new Error('Sass customisation sources changed during evaluation.');
await verifyFingerprints({'dist/css/bootstrap.css':sassReport.defaultDistribution.distributionSHA256},'Sass source-to-default distribution evidence');
const fontReport=JSON.parse(await readFile('qa/results/font-stability.json','utf8'));
if(fontReport.summary?.checks!==18||fontReport.summary.passed!==18||fontReport.summary.failed!==0||fontReport.summary.properties!==100||fontReport.summary.sourcesFrozen!==true||fontReport.checks.length!==18||fontReport.checks.some(row=>row.pass!==true))throw new Error('Font settling must preserve all 100 strict comparison properties and pass every readiness/negative probe.');
for(const browser of ['chromium','firefox','webkit'])for(const state of ['initial-prewarm','unchanged-fast-path','paint-only-fast-path','real-font-size-rejected','real-font-family-rejected','unstable-font-rejected'])if(!fontReport.checks.some(row=>row.browser===browser&&row.state===state&&row.pass===true))throw new Error('Missing font readiness boundary proof: '+browser+' '+state);
await verifyFingerprints(fontReport.sourceAtStart,'Font readiness proof start evidence');
await verifyFingerprints(fontReport.sourceAtEnd,'Font readiness proof end evidence');
if(orderedFingerprintEntries(fontReport.sourceAtStart)!==orderedFingerprintEntries(fontReport.sourceAtEnd))throw new Error('Font readiness proof inputs changed during evaluation.');
const standaloneFunctional=JSON.parse(await readFile('qa/results/standalone-functionality.json','utf8'));
const sf=standaloneFunctional.summary||{};
if(sf.fullMatrix!==true||sf.scriptFrozen!==true||sf.expectedPages!==40||sf.pageCases!==240||sf.completedPageCases!==240||sf.failed!==0||sf.findings!==0||sf.unavailableChecks!==0||sf.localLinkFailures!==0||sf.assetsFrozen!==true||!standaloneFunctional.finished||standaloneFunctional.checks.some(row=>row.pass!==true))throw new Error('Every standalone example must pass its complete three-engine, two-width functionality matrix.');
if(JSON.stringify([...standaloneFunctional.requestedMatrix.pages].sort())!==JSON.stringify([...exampleIds].sort())||JSON.stringify([...standaloneFunctional.requestedMatrix.engines].sort())!==JSON.stringify(['chromium','firefox','webkit'])||JSON.stringify([...standaloneFunctional.requestedMatrix.widths].sort((a,b)=>a-b))!==JSON.stringify([390,1440]))throw new Error('Standalone functionality must cover all40 actual pages in all three engines at both widths.');
for(const browser of ['chromium','firefox','webkit'])for(const width of [390,1440])for(const page of exampleIds)if(standaloneFunctional.pages.filter(row=>row.browser===browser&&row.width===width&&row.page===page&&row.completed===true).length!==1)throw new Error('Missing or repeated standalone functional page case: '+[browser,width,page]);
if(standaloneFunctional.dependencies.some(row=>row.kind==='script'&&(!row.available||row.integrityMatches!==true)))throw new Error('Original Chart.js and Masonry script integrations must be available and match their original SRI.');
for(const browser of ['chromium','firefox','webkit'])for(const type of ['offcanvas-alias-navigation','theme-storage-blocked','theme-storage-invalid'])if(!standaloneFunctional.checks.some(row=>row.browser===browser&&row.type===type&&row.pass===true))throw new Error('Missing standalone alias or optional-storage compatibility check: '+browser+' '+type);
await verifyFingerprints(standaloneFunctional.assetsAtStart,'Standalone functionality start evidence');
await verifyFingerprints(standaloneFunctional.assetsAtEnd,'Standalone functionality end evidence');
await verifyFingerprints({'qa/standalone-functionality.mjs':standaloneFunctional.scriptSHA256},'Standalone functionality harness');
if(orderedFingerprintEntries(standaloneFunctional.assetsAtStart)!==orderedFingerprintEntries(standaloneFunctional.assetsAtEnd))throw new Error('Standalone functionality inputs changed during measurement.');
const docsFunctional=JSON.parse(await readFile('qa/results/docs-functionality.json','utf8'));
const df=docsFunctional.summary||{};
if(df.completeMatrix!==true||df.canonicalPages!==33||df.pageVisits!==198||df.checks!==2944||df.passed!==2944||docsFunctional.checks.length!==2944||docsFunctional.inventory.length!==198||df.failed!==0||df.findings!==0||df.pageErrors!==0||df.missingLocalResources!==0||df.assetsFrozen!==true||!docsFunctional.finished||docsFunctional.checks.some(row=>row.pass!==true))throw new Error('Documentation examples must pass the complete33-page, three-engine, two-width functionality matrix.');
if(JSON.stringify([...df.browsers].sort())!==JSON.stringify(['chromium','firefox','webkit'])||JSON.stringify([...df.widths].sort((a,b)=>a-b))!==JSON.stringify([390,1440])||new Set(docsFunctional.inventory.map(row=>JSON.stringify([row.browser,row.width,row.page]))).size!==198)throw new Error('Documentation functionality has a missing or repeated browser/page/width case.');
for(const browser of ['chromium','firefox','webkit'])for(const width of [390,1440])for(const plugin of ['alert','carousel','collapse','dropdown','modal','offcanvas','popover','scrollspy','tab','toast','tooltip'])if(docsFunctional.checks.filter(row=>row.browser===browser&&row.width===width&&row.plugin===plugin&&row.name==='Native lifecycle event matrix'&&row.required?.length).length!==1)throw new Error('Missing/repeated native plugin lifecycle case: '+JSON.stringify({browser,width,plugin}));
await verifyFingerprints(docsFunctional.assetsAtStart,'Documentation functionality start evidence');
await verifyFingerprints(docsFunctional.assetsAtEnd,'Documentation functionality end evidence');
if(orderedFingerprintEntries(docsFunctional.assetsAtStart)!==orderedFingerprintEntries(docsFunctional.assetsAtEnd))throw new Error('Documentation functionality inputs changed during measurement.');
const nestedFunctional=JSON.parse(await readFile('qa/results/docs-nested-functionality.json','utf8'));
const nf=nestedFunctional.summary||{};
if(nf.completeMatrix!==true||nf.canonicalPages!==3||nf.expectedPageVisits!==18||nf.pageVisits!==18||nf.checks!==168||nf.passed!==168||nestedFunctional.checks.length!==168||nf.failed!==0||nf.findings!==0||nf.pageErrors!==0||nf.missingLocalResources!==0||nf.assetsFrozen!==true||nestedFunctional.checks.some(row=>row.pass!==true))throw new Error('Nested documentation navbar controls must pass every live-parent and dropdown case in all three engines at both widths.');
await verifyFingerprints(nestedFunctional.assetsAtStart,'Nested navigation start evidence');
await verifyFingerprints(nestedFunctional.assetsAtEnd,'Nested navigation end evidence');
if(orderedFingerprintEntries(nestedFunctional.assetsAtStart)!==orderedFingerprintEntries(nestedFunctional.assetsAtEnd))throw new Error('Nested navigation inputs changed during measurement.');
const linkFunctional=JSON.parse(await readFile('qa/results/example-links.json','utf8'));
if(linkFunctional.summary?.pages!==176||linkFunctional.summary.standalonePages!==40||linkFunctional.summary.findings!==0||linkFunctional.summary.fragmentFailures!==0||linkFunctional.summary.integrityFailures!==0||linkFunctional.summary.copyTargets!==1090||linkFunctional.summary.editTargets!==512||linkFunctional.summary.snippetFailures!==0||linkFunctional.summary.assetsFrozen!==true||linkFunctional.requests.some(row=>row.pass!==true)||linkFunctional.findings.length)throw new Error('Every published local route, loaded asset, fragment, SRI and native copy/edit target check must pass.');
await verifyFingerprints(linkFunctional.sourceAtStart,'Local routes/assets start evidence');
await verifyFingerprints(linkFunctional.sourceAtEnd,'Local routes/assets end evidence');
if(orderedFingerprintEntries(linkFunctional.sourceAtStart)!==orderedFingerprintEntries(linkFunctional.sourceAtEnd))throw new Error('Local route/asset inputs changed during measurement.');
const exportFunctional=JSON.parse(await readFile('qa/results/snippet-export.json','utf8'));
const ef=exportFunctional.summary||{};
if(exportFunctional.runtimeStatus!=='complete'||ef.sourceProofPass!==true||ef.sourceBoundaries!==7||ef.projects!==63||ef.expectedProjects!==63||ef.passed!==ef.checks||ef.findings!==0||ef.externalProjectsSubmitted!==0||ef.assetsFrozen!==true||exportFunctional.findings.length||exportFunctional.checks.some(row=>row.pass!==true))throw new Error('All63 real SDK snippet exports must pass captured-payload and isolated-origin functionality checks.');
for(const browser of ['chromium','firefox','webkit'])for(const [theme,direction]of [['light','ltr'],['dark','ltr'],['dark','rtl']])for(const example of ['dropdown','modal','tooltip','popover','live-alert','local-svg','css-grid'])if(exportFunctional.projects.filter(row=>row.browser===browser&&row.theme===theme&&row.direction===direction&&row.example===example).length!==1)throw new Error('Missing or repeated snippet-export case: '+[browser,theme,direction,example]);
await verifyFingerprints(exportFunctional.assetsAtStart,'Snippet export start evidence');
await verifyFingerprints(exportFunctional.assetsAtEnd,'Snippet export end evidence');
if(orderedFingerprintEntries(exportFunctional.assetsAtStart)!==orderedFingerprintEntries(exportFunctional.assetsAtEnd))throw new Error('Snippet export inputs changed during measurement.');
if(docsSource.checks?.themeStorageGuardExact!==true||docsSource.checks?.snippetExportSourceExact!==true||docsSource.checks?.versionScopeSourceExact!==true||docsSource.checks?.derivedPreviewCaptureExact!==true)throw new Error('All exact documentation functionality/version/preview source boundaries must pass.');
const docsBuild=JSON.parse(await readFile(path.join(docsOutput,'tq-docs-build.json'),'utf8'));
const previews=JSON.parse(await readFile('qa/results/example-previews.json','utf8'));
if(previews.summary?.pages!==40||previews.summary.images!==80||previews.summary.expectedImages!==80||previews.summary.captureInputFiles!==169||previews.summary.publicationOutputs!==81||previews.summary.findings!==0||previews.summary.assetsFrozen!==true||previews.pages.length!==40||previews.images.length!==80||previews.findings.length||Object.keys(previews.sourceInputHashes).length!==169||previews.publicationOutputs.length!==81||orderedFingerprintEntries(previews.assetsAtStart)!==orderedFingerprintEntries(previews.assetsAtEnd))throw new Error('All40 TQ example pages and80 native-sized previews must have complete frozen capture evidence.');
const capturedInputs=Object.fromEntries(Object.entries(previews.assetsAtStart).filter(([file])=>!previews.publicationOutputs.includes(file)));
if(orderedFingerprintEntries(capturedInputs)!==orderedFingerprintEntries(previews.sourceInputHashes))throw new Error('Preview capture input boundary differs from its exact observed inventory.');
await verifyFingerprints(previews.sourceInputHashes,'Example preview actual capture inputs');
await verifyFingerprints({'scripts/build-example-previews.mjs':previews.scriptSHA256},'Example preview capture harness');
const previewNames=new Set(),publicationExpected=new Set(['docs/5.3/examples/index.html']);
if(docsBuild.galleryPreviews?.length!==80)throw new Error('Build must publish all80 captured previews.');
for(const id of exampleIds)for(const density of ['1x','2x']){
 const matches=previews.images.filter(row=>row.id===id&&row.density===density);
 if(matches.length!==1)throw new Error('Missing/repeated preview: '+id+' '+density);
 const image=matches[0],name=id+(density==='2x'?'@2x':'')+'.png',source='docs-source/site/static/docs/[version]/example-previews/'+name,publication='docs/5.3/assets/img/examples/'+name;
 const width=density==='1x'?480:960,height=density==='1x'?300:600;
 if(image.path!==source||image.width!==width||image.height!==height||image.paint?.theme!=='light'||image.paint?.primary.toLowerCase()!=='#e31b23')throw new Error('Preview dimensions/source/TQ paint mismatch: '+name);
 const data=await readFile(source);
 if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.readUInt32BE(16)!==width||data.readUInt32BE(20)!==height)throw new Error('Invalid native-size PNG: '+source);
 await verifyFingerprints({[source]:image.sha256,[image.sourceHTML.path]:image.sourceHTML.sha256,...image.sourceCSSAndJS,[publication]:image.sha256},'TQ example preview evidence');
 const built=docsBuild.galleryPreviews.filter(row=>row.file===name);
 if(built.length!==1||built[0].width!==width||built[0].height!==height||built[0].sha256!==image.sha256)throw new Error('Preview build record mismatch: '+name);
 previewNames.add(name);publicationExpected.add(publication);
}
if(previewNames.size!==80||JSON.stringify([...publicationExpected].sort())!==JSON.stringify([...previews.publicationOutputs].sort()))throw new Error('Capture output exclusion differs from the exact native gallery and80 previews.');
const repairedLinks=docsBuild.navigationRepairs?.flatMap(page=>page.substitutions)||[];
if(docsBuild.navigationRepairs?.length!==5||repairedLinks.length!==6||repairedLinks.some(row=>row.count!==1))throw new Error('The exact six nonvisual legacy-link repairs must be recorded.');
for(const page of docsBuild.navigationRepairs){
 const after=await readFile(path.join(docsOutput,page.page),'utf8');
 if(createHash('sha256').update(after).digest('hex')!==page.afterSHA256)throw new Error('Legacy-link destination evidence is stale: '+page.page);
 let candidates=[after];
 for(const change of page.substitutions){
  const target='href="'+change.to+'"',replacement='href="'+change.from+'"',next=[];
  for(const candidate of candidates)for(let at=candidate.indexOf(target);at!==-1;at=candidate.indexOf(target,at+target.length))next.push(candidate.slice(0,at)+replacement+candidate.slice(at+target.length));
  candidates=[...new Set(next)];
  if(!candidates.length||candidates.length>32)throw new Error('Legacy-link repair occurrence mismatch');
 }
 if(candidates.filter(before=>createHash('sha256').update(before).digest('hex')===page.beforeSHA256).length!==1)throw new Error('Legacy-link repair altered more than its recorded href: '+page.page);
}
const chartDiagnostic=JSON.parse(await readFile('qa/results/chart-theme-paint-diagnostic.json','utf8'));
if(chartDiagnostic.baseline?.cases!==36||chartDiagnostic.baseline.staleCanvasFailures!==10||chartDiagnostic.proof?.cases!==36||chartDiagnostic.proof.timeouts!==0||chartDiagnostic.proof.measuredPaintReady!==36||chartDiagnostic.proof.geometryPreserved!==36||chartDiagnostic.proof.negativeProbesRejected!==36)throw new Error('Chart repaint regression evidence must retain the original failing baseline and complete geometry/negative-probe proof.');
// Product hashes in this diagnostic describe its historical failing baseline.
// Current product hashes are independently verified by both acceptance suites.
await verifyFingerprints(Object.fromEntries(Object.entries(chartDiagnostic.files).filter(([file])=>file.startsWith('qa/'))),'Preserved chart repaint diagnostic provenance');
{
 const baseline=JSON.parse(await readFile('qa/results/chart-theme-paint-baseline.json','utf8'));
 const proof=JSON.parse(await readFile('qa/results/chart-theme-paint-fix-proof.json','utf8'));
 const must=(ok,message)=>{if(!ok)throw new Error('Chart diagnostic: '+message);};
 const key=row=>JSON.stringify([row.browser,row.round,row.theme,row.direction]);
 const expected=new Set(['chromium','firefox','webkit'].flatMap(browser=>[0,1,2].flatMap(round=>['light','dark'].flatMap(theme=>['','-rtl'].map(direction=>key({browser,round,theme,direction}))))));
 for(const [label,report]of [['baseline',baseline],['proof',proof]]){
  must(Array.isArray(report.cases)&&report.cases.length===36,label+' must contain 36 raw cases');
  const keys=report.cases.map(key);
  must(new Set(keys).size===36&&keys.every(value=>expected.has(value)),label+' matrix is incomplete or duplicated');
  must(report.summary?.cases===report.cases.length&&report.cases.every(row=>typeof row.privateCacheReady==='boolean')&&report.summary.timeouts===report.cases.filter(row=>!row.privateCacheReady).length,label+' summary differs from measured raw rows');
 }
 const stale=baseline.cases.filter(row=>!row.privateCacheReady);
 must(stale.length===10,'baseline must retain the 10 reproduced failures');
 for(const row of stale){
  const last=row.snapshots?.at(-1);
  must(last&&last.theme===(row.theme==='light'?'dark':'light'),'baseline theme did not change');
  must(Object.keys(last.axes||{}).sort().join(',')==='x,y'&&Object.values(last.axes).every(axis=>axis.labelItems===null),'baseline failure must retain null label caches');
  must(Array.isArray(row.trace?.paint)&&row.trace.paint.filter(paint=>paint.at>row.changeAt).length===0,'baseline failure unexpectedly drew new paint');
  must(row.trace.events.some(event=>event.at>=row.changeAt&&event.callbackSource==="() => chart.update('none')"),'baseline original observer was not recorded');
 }
 must(proof.inMemoryDrawFix===true&&proof.inMemoryNegativeProbe===true,'proof must identify the in-memory fix and negative probe');
 for(const row of proof.cases){
  const [before,after]=row.snapshots||[];
  must(row.privateCacheReady===true&&before?.theme===row.theme&&after?.theme===(row.theme==='light'?'dark':'light'),'proof theme/readiness failed');
  const geometry=before.geometry;
  must(geometry&&geometry.points?.length===7&&geometry.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))&&Object.keys(geometry.axes||{}).sort().join(',')==='x,y'&&geometry.chartArea&&geometry.size?.length===2,'proof native geometry snapshot is incomplete');
  must(JSON.stringify(geometry)===JSON.stringify(after.geometry)&&row.geometryPreserved===true,'proof changed native geometry');
  const labels=Object.values(after.axes||{}).flatMap(axis=>axis.tickLabels).map(String);
  must(labels.length===15&&new Set(labels).size===15,'proof must cover all 15 original axis labels');
  const first=labels.map(label=>row.trace.paint.filter(paint=>paint.at>row.changeAt).find(paint=>paint.text===label));
  must(first.every(paint=>paint&&paint.fillStyle===after.normalizedColour&&paint.alpha===1)&&row.measuredPaintReady===true&&JSON.stringify(first)===JSON.stringify(row.axisPaint),'proof actual first-axis paint is stale, missing or differs from the raw trace');
  const negative=row.negativeProbe;
  must(negative&&negative.expected===after.normalizedColour&&negative.wrong!==negative.expected&&negative.rejected===true,'negative probe identity/rejection missing');
  must(labels.every(label=>{const paint=negative.paints.find(paint=>paint.text===label);return paint&&paint.fillStyle===negative.wrong&&paint.alpha===1;}),'negative probe must draw all 15 labels in stale paint');
 }
 must(proof.summary.timeouts===0&&proof.summary.measuredPaintReady===36&&proof.summary.geometryPreserved===36&&proof.summary.negativeProbesRejected===36,'proof summary differs from complete passing raw rows');
}
const evidence=await Promise.all([...evidenceFiles,...parallelProvenanceFiles].map(async file=>({file,sha256:createHash('sha256').update(await readFile(file)).digest('hex')})));
await mkdir('release',{recursive:true});

// The archive uses an explicit source allowlist. Retired custom examples and
// earlier evaluation evidence are deliberately outside this distribution.
const filename='release/tq-bootstrap-1.0.0.zip';
const sourceDirectories=['src/scss','dist','upstream','assets/bootstrap-icons'];
const sourceFiles=[
 'README.md','LICENSE','THIRD-PARTY-NOTICES.md','package.json','package-lock.json','index.html',
 'docs/INTEGRATION.md','scripts/build.mjs','scripts/acquire-upstream.mjs',
 'scripts/serve.mjs','scripts/package.mjs','scripts/verify-package.mjs','scripts/publish-docs.mjs','scripts/build-downloads.mjs','scripts/build-example-previews.mjs',
 'qa/README.md','qa/compiled-parity.mjs','qa/rendered-parity.mjs','qa/docs-colour-parity.mjs','qa/package-portability.mjs','qa/examples-colour-parity.mjs','qa/colour-substitution-proof.mjs','qa/example-contrast.mjs','qa/palette-contrast.mjs','qa/palette-labels.mjs','qa/merge-rendered-runs.mjs','qa/sass-customisation.mjs','qa/font-stability.mjs','qa/font-stability-proof.mjs','qa/chart-theme-paint-diagnostic.mjs',
 'qa/standalone-functionality.mjs','qa/docs-functionality.mjs','qa/snippet-export.mjs','qa/example-links.mjs',
 'qa/docs-nested-functionality.mjs','qa/version-scope.mjs',
 ...evidenceFiles,...renderedProvenanceFiles,...parallelProvenanceFiles,'qa/results/pre-colour-only-deviations.json','qa/results/colour-only-upstream-integrity.json'
];
await new Promise((resolve,reject)=>{
 const output=fs.createWriteStream(filename);
 const archive=archiver('zip',{zlib:{level:9}});
 output.on('close',resolve);
 archive.on('error',reject);
 output.on('error',reject);
 archive.pipe(output);
 for(const directory of sourceDirectories)archive.directory(directory,'tq-bootstrap/'+directory);
 for(const file of sourceFiles)archive.file(file,{name:'tq-bootstrap/'+file});
 archive.glob('**/*',{
  cwd:'docs-source',dot:true,
  ignore:['node_modules/**','**/node_modules/**','site/public/**','site/.astro/**','site/dist/**','**/.cache/**','**/.DS_Store','build-docs.log','tq-customize.mjs']
 },{prefix:'tq-bootstrap/docs-source'});
 // This is Bootstrap's compiled documentation, including its official examples.
 archive.glob('**/*',{cwd:docsOutput,dot:true,ignore:['index.html']},{prefix:'tq-bootstrap'});
 for(const screenshot of new Set([...rendered.screenshots,...examples.screenshots,'screenshots/expanded-tq-palette.png','screenshots/tq-examples-version-5-3.png']))archive.file('qa/results/'+screenshot,{name:'tq-bootstrap/qa/results/'+screenshot});
 archive.finalize();
});
const body=await readFile(filename);
const outputs=[{file:filename,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')}];
await writeFile('release/checksums.json',JSON.stringify({version:'1.0.0',bootstrap:'5.3.8',scope:'Original Bootstrap source, website, documentation, examples and JavaScript with TAFE Queensland colour substitutions only; documented local build and service-path exceptions',built:new Date().toISOString(),inventories,evidence,outputs},null,2)+'\n');
await writeFile('release/SHA256SUMS.txt',outputs.map(item=>item.sha256+'  '+path.basename(item.file)).join('\n')+'\n');
console.log(filename+': '+(body.length/1048576).toFixed(2)+' MB');
