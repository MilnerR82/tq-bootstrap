import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as sass from 'sass';
import {chromium,firefox,webkit} from 'playwright';
import axe from 'axe-core';

const root=path.resolve(import.meta.dirname,'../..');
const prebuild=process.argv.includes('--prebuild');
const origin=process.env.TQ_PREVIEW_ORIGIN||'http://127.0.0.1:5198';
const out=path.join(root,'qa/results/remediation-20261022/paint-regression'+(prebuild?'-prebuild':'')+'.json');
const sha=value=>createHash('sha256').update(value).digest('hex');
const classification=JSON.parse(await fs.readFile(path.join(root,'qa/results/missed-audit-20261022/broad-contrast-classification.json'),'utf8'));
const groups=['tq-card-header','tq-floating-label','tq-swatch-label','tq-warning-code-comment','native-navbar-context','native-neutral-link','native-secondary-dark','native-diff-syntax','native-scrollspy-active','native-accent-demo','native-home-pills'];
const byRoute=new Map();
for(const group of groups)for(const node of classification.groups[group].nodes){
 const route=new URL(node.finalURL).pathname;
 if(!byRoute.has(route))byRoute.set(route,[]);
 byRoute.get(route).push({group,selector:node.selector,baselineHTML:node.currentHTML});
}
// Explicitly cover all contextual card roles, and every current floating label.
byRoute.set('/docs/5.3/components/card/',[{group:'TQ-01-all-eight-roles',selector:'.card[class*="text-bg-"] > .card-header'},{group:'dark-blockquote-footer',selector:'.card .blockquote-footer'}]);
byRoute.set('/docs/5.3/forms/floating-labels/',[{group:'TQ-02-all-enabled-labels',selector:'.form-floating:not(:has(:disabled)) > label'}]);
byRoute.set('/docs/5.3/utilities/spacing/',[{group:'A11Y-06',selector:'.bd-file-ref .highlight-toolbar > a.link-secondary'}]);
for(const route of ['/docs/5.3/getting-started/download/','/docs/5.3/components/tooltips/']){
 const rows=byRoute.get(route)||[];rows.push({group:'TQ-04-all-warning-comments',selector:'.bd-callout-warning .highlight .token.comment'});byRoute.set(route,rows);
}
const sourcePaths=['src/scss/_tokens.scss','src/scss/tq-bootstrap.scss','src/scss/_accessible-colours.scss','src/scss/_forced-colours.scss','src/scss/_validation-focus-colours.scss','qa/remediation/approved-paint-literals.mjs','docs-source/_tq-tokens.scss','docs-source/site/src/scss/_tq-docs.scss','qa/remediation/paint-regression.mjs'];
const report={audit:'Actual-page contrast regression for remediated ordinary reading/control contexts',started:new Date().toISOString(),prebuild,method:prebuild?'Candidate Sass compiled in memory and injected after the correctly SRI-validated published styles in an isolated QA browser. Published files are unchanged.':'Actual published pages and stylesheet responses, without CSS substitution. Each intended target is measured in both modes; axe text contrast runs on exact bound nodes. Diagnostic low-opacity samples are independently classified, not claimed to pass.',limits:['This is targeted paint regression evidence, not whole-page/process WCAG conformance.','Prebuild checks use the currently published markup and disclose all page hashes.','Pure black on purple-300, teal-600 and cyan-600 is a documented minimum-contrast palette exception; the swatch background and printed scale label stay truthful.'],classificationSHA256:sha(await fs.readFile(path.join(root,'qa/results/missed-audit-20261022/broad-contrast-classification.json'))),scriptSHA256:sha(await fs.readFile(import.meta.filename)),sourceHashes:{},pageHashes:{},visits:[],errors:[]};
report.method+=' A genuine viewport screenshot is captured before computed-style/axe measurement to flush the browser display list. In this WebKit environment, child-first getComputedStyle could otherwise expose UA body paint before the display-list flush despite a correctly rendered dark page. Screenshots change no page styles or DOM.';
try{const previous=await fs.readFile(path.join(root,'qa/results/remediation-20261022/paint-regression-initial.json'));report.previousAttempts=[{file:'qa/results/remediation-20261022/paint-regression-initial.json',sha256:sha(previous),disposition:'Initial complete 174-visit run had four failed assertions for the same three WebKit dark-checkout footer links. Reproduction isolated unflushed WebKit computed body paint; four viewport screenshot repetitions restored the correct declared/visually rendered body paint without a product change. The final run flushes the genuine display list before every measurement, keeps all targets/thresholds and reruns the full matrix.'}];}catch(error){if(error.code!=='ENOENT')throw error;}
for(const file of sourcePaths)report.sourceHashes[file]=sha(await fs.readFile(path.join(root,file)));
for(const route of byRoute.keys()){
 const file=route==='/'?'index.html':route.slice(1)+'index.html';
 report.pageHashes[file]=sha(await fs.readFile(path.join(root,file)));
}
async function publishedAssets(){
 const files={...report.pageHashes};
 async function walk(directory){for(const entry of await fs.readdir(path.join(root,directory),{withFileTypes:true})){const file=directory+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(/\.(?:css|js)$/.test(file))files[file]=sha(await fs.readFile(path.join(root,file)));}}
 for(const directory of ['docs/5.3/assets','docs/5.3/dist/css','docs/5.3/dist/js'])await walk(directory);
 for(const file of Object.keys(report.pageHashes))files[file]=sha(await fs.readFile(path.join(root,file)));
 return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}
report.assetsAtStart=await publishedAssets();
let css;
if(prebuild){
 const opts={silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}};
 css={framework:sass.compile(path.join(root,'src/scss/tq-bootstrap.scss'),{...opts,loadPaths:[path.join(root,'node_modules')]}).css,docs:sass.compileString('@import "docs";\n@import "docs_search";\n@import "tq-docs";',{...opts,loadPaths:[path.join(root,'docs-source/site/src/scss'),path.join(root,'docs-source/node_modules')]}).css};
 report.candidateCSSHashes=Object.fromEntries(Object.entries(css).map(([name,text])=>[name,sha(text)]));
}
const engines=prebuild?{chromium}:{chromium,firefox,webkit};
await fs.mkdir(path.dirname(out),{recursive:true});
const save=async()=>fs.writeFile(out,JSON.stringify(report,null,2));
for(const [engineName,engine] of Object.entries(engines)){
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  return route.continue();
 });
 for(const theme of ['light','dark'])for(const [route,targets] of byRoute){
  const page=await context.newPage();const visit={engine:engineName,theme,route,targets:[],resolutions:[],pageErrors:[],missingLocal:[],checks:[],error:null};
  page.on('pageerror',e=>visit.pageErrors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))visit.missingLocal.push({url:r.url(),status:r.status()});});
  try{
   await page.emulateMedia({colorScheme:theme});await page.goto(origin+route,{waitUntil:'load'});
   if(css){await page.addStyleTag({content:css.framework});if(!route.startsWith('/docs/5.3/examples/'))await page.addStyleTag({content:css.docs});}
   await page.evaluate(theme=>document.documentElement.setAttribute('data-bs-theme',theme),theme);
   await page.evaluate(()=>document.fonts.ready);await page.addScriptTag({content:axe.source});
   const rendered=await page.screenshot();visit.renderProof={viewportScreenshotSHA256:sha(rendered),body:await page.evaluate(()=>({color:getComputedStyle(document.body).color,background:getComputedStyle(document.body).backgroundColor,theme:document.documentElement.getAttribute('data-bs-theme')}))};
   for(const target of targets){
    const resolution=await page.evaluate(({target,index})=>{
     if(!target.baselineHTML)return{...target,originalSelector:target.selector,status:'current-semantic-selector'};
     const template=document.createElement('template');template.innerHTML=target.baselineHTML;
     const ref=template.content.firstElementChild,norm=s=>s.replace(/\s+/g,' ').trim();
     const equivalent=el=>el.tagName===ref.tagName&&norm(el.textContent)===norm(ref.textContent)&&[...ref.classList].every(c=>el.classList.contains(c))&&['id','for'].every(a=>!ref.hasAttribute(a)||el.getAttribute(a)===ref.getAttribute(a));
     const original=[...document.querySelectorAll(target.selector)].filter(equivalent);
     if(original.length===1&&document.querySelectorAll(target.selector).length===1)return{...target,originalSelector:target.selector,status:'original-exact-content',matchedHTML:original[0].outerHTML};
     const candidates=original.length===1?original:[...document.getElementsByTagName(ref.tagName)].filter(equivalent);
     if(candidates.length!==1)return{...target,originalSelector:target.selector,selector:null,status:'unresolved',candidateCount:candidates.length};
     const selector=`[data-tq-paint-bound="${index}"]`;candidates[0].setAttribute('data-tq-paint-bound',index);
     return{...target,originalSelector:target.selector,selector,status:'unique-baseline-content-rebound',candidateCount:1,matchedHTML:candidates[0].outerHTML,proof:'Same tag, normalized text, all original classes, and original id/for when present; unique exact content among current page candidates.'};
    },{target,index:visit.resolutions.length});
    visit.resolutions.push(resolution);
    if(!resolution.selector){visit.checks.push({id:'target-exists',group:target.group,selector:target.selector,pass:false,count:0,resolution});continue;}
    const nodes=await page.locator(resolution.selector).evaluateAll((elements,target)=>{
     const parse=s=>{const m=s.match(/[\d.]+/g)?.map(Number);return m?[...m.slice(0,3),m[3]??1]:[0,0,0,0];};
     const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
     const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
     return elements.map(el=>{const cs=getComputedStyle(el),anc=[];for(let n=el;n;n=n.parentElement)anc.unshift(n);const bg=anc.reduce((b,n)=>over(parse(getComputedStyle(n).backgroundColor),b),[255,255,255,1]),fg=over(parse(cs.color),bg),l=[lum(fg),lum(bg)].sort((a,b)=>b-a),size=parseFloat(cs.fontSize),large=size>=24||(size>=18.66&&Number(cs.fontWeight)>=700);return{...target,html:el.outerHTML,text:el.textContent,color:cs.color,background:bg,ratio:(l[0]+.05)/(l[1]+.05),required:large?3:4.5,visible:Boolean(el.getClientRects().length),opacityChain:anc.map(n=>Number(getComputedStyle(n).opacity)),rect:el.getBoundingClientRect().toJSON()};});
    },{...target,selector:resolution.selector,originalSelector:target.selector});
    visit.targets.push(...nodes);
    visit.checks.push({id:'target-exists',group:target.group,selector:target.selector,pass:nodes.length>0,count:nodes.length});
   }
   const bound=visit.resolutions.filter(t=>t.selector).map(t=>t.selector).join(',');
   visit.axe=await page.evaluate(selector=>axe.run({include:[...document.querySelectorAll(selector)]},{runOnly:{type:'rule',values:['color-contrast']}}),bound);
   const measured=visit.targets.filter(n=>n.visible&&n.opacityChain.every(v=>v===1));
   for(const node of measured)visit.checks.push({id:'measured-text-contrast',group:node.group,selector:node.selector,text:node.text,ratio:node.ratio,required:node.required,pass:node.ratio>=node.required});
   visit.checks.push({id:'targeted-axe-contrast',pass:visit.axe.violations.length===0,violationNodes:visit.axe.violations.flatMap(v=>v.nodes).length});
   visit.controlStates=[];
   for(const target of visit.resolutions.filter(t=>t.selector&&t.originalSelector.includes('btn-outline'))){
    const matches=page.locator(target.selector);
    for(let index=0;index<await matches.count();index++){
     const control=matches.nth(index);if(!await control.isVisible()||!await control.isEnabled())continue;
     for(const state of ['hover','focus']){
      if(state==='hover')await control.hover();else{await page.mouse.move(0,0);await control.focus();}
      const data=await control.evaluate(async(el,state)=>({state,html:el.outerHTML,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,result:await axe.run({include:[el]},{runOnly:{type:'rule',values:['color-contrast']}})}),state);
      visit.controlStates.push(data);visit.checks.push({id:'search-control-state-contrast',state,selector:target.selector,pass:data.result.violations.length===0,violations:data.result.violations.flatMap(v=>v.nodes).length});
     }
     await control.blur();await page.mouse.move(0,0);
    }
   }
   const footer=page.locator('.bd-footer .list-unstyled.small a');
   if(await footer.count()){
    visit.footer=await footer.evaluateAll(es=>es.map(el=>({text:el.textContent,decoration:getComputedStyle(el).textDecorationLine})));
    visit.checks.push({id:'A11Y-07-persistent-footer-link-cue',pass:visit.footer.length===4&&visit.footer.every(n=>n.decoration.includes('underline'))});
   }
  }catch(e){visit.error=String(e);report.errors.push({engine:engineName,theme,route,error:String(e)});}
  report.visits.push(visit);await page.close();await save();
  console.log(`${engineName} ${theme} ${route} ${visit.checks.filter(c=>!c.pass).length} failed`);
 }
 await context.close();await browser.close();
}
const after={};for(const file of sourcePaths)after[file]=sha(await fs.readFile(path.join(root,file)));
report.finished=new Date().toISOString();report.sourceHashesAfter=after;report.assetsAtEnd=await publishedAssets();
report.summary={routes:byRoute.size,engines:Object.keys(engines),visits:report.visits.length,checks:report.visits.flatMap(v=>v.checks).length,failed:report.visits.flatMap(v=>v.checks).filter(c=>!c.pass).length,errors:report.errors.length,pageErrors:report.visits.flatMap(v=>v.pageErrors).length,missingLocal:report.visits.flatMap(v=>v.missingLocal).length,sourceFrozen:JSON.stringify(report.sourceHashes)===JSON.stringify(after),assetsFrozen:JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd),scriptFrozen:report.scriptSHA256===sha(await fs.readFile(import.meta.filename))};
await save();console.log(JSON.stringify(report.summary));if(report.summary.failed||report.summary.errors||report.summary.pageErrors||report.summary.missingLocal||!report.summary.sourceFrozen||!report.summary.assetsFrozen||!report.summary.scriptFrozen)process.exitCode=1;
