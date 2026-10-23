import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium,firefox,webkit} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resultDir=path.join(root,'qa/results');
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198';
const hash=value=>createHash('sha256').update(value).digest('hex');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
async function walk(dir){const output=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isDirectory())output.push(...await walk(target));else output.push(target);}return output;}
async function snapshot(){
 const browser=await chromium.launch();const page=await browser.newPage();const pages={};
 const sourceDist=path.join(root,'docs-source/site/dist');
 const files=(await walk(sourceDist)).filter(file=>file.endsWith('.html')).map(file=>path.join(root,path.relative(sourceDist,file)));
 for(const file of [...new Set(files)].sort()){
  const source=await fs.readFile(file,'utf8');const relative=path.relative(root,file).replaceAll('\\','/');
  const parsed=await page.evaluate(source=>{const document=new DOMParser().parseFromString(source,'text/html');const themeColors=[...document.querySelectorAll('meta[name="theme-color"]')].map(el=>el.getAttribute('content'));const maskColors=[...document.querySelectorAll('link[rel="mask-icon"]')].map(el=>el.getAttribute('color'));for(const el of document.querySelectorAll('meta[name="theme-color"]'))el.removeAttribute('content');for(const el of document.querySelectorAll('link[rel="mask-icon"]'))el.removeAttribute('color');return {normalized:document.documentElement.outerHTML,themeColors,maskColors};},source);
  pages[relative]={sha256:hash(source),normalizedDOMSHA256:hash(parsed.normalized),themeColors:parsed.themeColors,maskColors:parsed.maskColors};
 }
 await browser.close();
 const assets={};for(const dir of ['dist/css','dist/js','docs/5.3/dist','docs/5.3/assets'])for(const file of await walk(path.join(root,dir)))if(/\.(css|js)$/.test(file))assets[path.relative(root,file).replaceAll('\\','/')]=hash(await fs.readFile(file));
 const manifests={};for(const file of (await walk(path.join(root,'docs/5.3/assets'))).filter(file=>path.basename(file)==='manifest.json')){const source=await fs.readFile(file,'utf8');const data=JSON.parse(source);const {theme_color,background_color,...rest}=data;manifests[path.relative(root,file).replaceAll('\\','/')]={sha256:hash(source),normalizedJSONSHA256:hash(JSON.stringify(rest)),theme_color,background_color};}
 return {captured:new Date().toISOString(),pages,assets,manifests,primaryReviewSHA256:hash(await fs.readFile(path.join(resultDir,'docs-revision.json')))};
}
await fs.mkdir(resultDir,{recursive:true});
if(process.argv.includes('--capture-before')){const before=await snapshot();await fs.writeFile(path.join(resultDir,'docs-metadata-before.json'),JSON.stringify(before,null,2)+'\n');console.log(JSON.stringify({captured:true,pages:Object.keys(before.pages).length,assets:Object.keys(before.assets).length,primaryReviewSHA256:before.primaryReviewSHA256}));}
else{
 const before=JSON.parse(await fs.readFile(path.join(resultDir,'docs-metadata-before.json'),'utf8'));const after=await snapshot();const beforePaths=Object.keys(before.pages);const afterPaths=Object.keys(after.pages);assert(JSON.stringify(beforePaths)===JSON.stringify(afterPaths),'Published HTML inventory changed during metadata-only update');assert(JSON.stringify(before.assets)===JSON.stringify(after.assets),'CSS or JavaScript assets changed during metadata-only update');assert(before.primaryReviewSHA256===after.primaryReviewSHA256,'Original 141-check report was changed');
 const changes=[];for(const file of beforePaths){const prior=before.pages[file],current=after.pages[file];assert(prior.normalizedDOMSHA256===current.normalizedDOMSHA256,`HTML DOM changed beyond theme-color/mask-icon colour attributes: ${file}`);for(const color of [...current.themeColors,...current.maskColors])assert(['#e31b23','#8a0008'].includes(color?.toLowerCase()),`Non-TQ browser metadata colour ${color} in ${file}`);if(prior.sha256!==current.sha256)changes.push({file,before:prior,after:current});}
 assert(JSON.stringify(Object.keys(before.manifests))===JSON.stringify(Object.keys(after.manifests)),'Web app manifest inventory changed');const manifestChanges=[];for(const file of Object.keys(before.manifests)){const prior=before.manifests[file],current=after.manifests[file];assert(prior.normalizedJSONSHA256===current.normalizedJSONSHA256,`Web app manifest changed beyond theme/background colours: ${file}`);assert(current.theme_color==='#e31b23'&&current.background_color==='#ffffff',`Web app manifest colours do not match TQ white/red: ${file}`);if(prior.sha256!==current.sha256)manifestChanges.push({file,before:prior,after:current});}
 const browsers=[];for(const [name,type]of Object.entries({chromium,firefox,webkit})){const browser=await type.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});const evidence=[];for(const url of [base+'/',base+'/docs/5.3/components/buttons/']){const response=await page.goto(url,{waitUntil:'networkidle'});assert(response?.ok(),`White-page check failed in ${name}`);const state=await page.evaluate(()=>({title:document.title,body:getComputedStyle(document.body).backgroundColor,themeColor:document.querySelector('meta[name="theme-color"]')?.content}));assert(state.body==='rgb(255, 255, 255)',`Default body is not white in ${name}`);assert(['#e31b23','#8a0008'].includes(state.themeColor?.toLowerCase()),`Browser theme metadata is not TQ red in ${name}`);evidence.push({url,...state});}browsers.push({browser:name,checks:evidence});await browser.close();}
 const report={suite:'Metadata-only brand colour delta after focused documentation review',finished:new Date().toISOString(),method:'Compare published HTML DOMs after removing only theme-color content and mask-icon color attributes; compare web app manifest excluding only theme/background colour fields; compare every local CSS/JavaScript asset; preserve the full 141-check report; repeat default white-page checks in three browser engines.',beforeCaptured:before.captured,afterCaptured:after.captured,primaryReviewSHA256:after.primaryReviewSHA256,summary:{htmlPages:beforePaths.length,metadataChangedPages:changes.length,domEquivalenceFailures:0,assetChanges:0,assetsCompared:Object.keys(before.assets).length,manifestChangedFiles:manifestChanges.length,whitePageChecks:6,failed:0},changes,manifestChanges,browsers,after};await fs.writeFile(path.join(resultDir,'docs-metadata-delta.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
}
