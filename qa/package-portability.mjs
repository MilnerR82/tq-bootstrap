import {mkdir,readFile,writeFile,cp,stat,readdir} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
process.chdir(root);
const folder=path.join(root,'.cache','relocation-bootstrap-'+Date.now());
await mkdir(folder,{recursive:true});
const filename='tq-bootstrap-1.0.0.zip';
const sha=body=>createHash('sha256').update(body).digest('hex');
const companionFiles=['tq-accessibility.js','tq-accessibility.js.map','tq-accessibility.min.js','tq-accessibility.min.js.map','tq-accessibility.esm.js','tq-accessibility.esm.js.map'];
const report={suite:'Bootstrap-only ZIP extraction, relocation, native downloads and clean rebuild',date:new Date().toISOString(),checks:[],failures:[],archives:[],downloads:[],hostedServices:[],scope:'Local framework assets, separately supplied accessibility companion, native modal behaviour and all three native download routes/archive contents are tested with external requests blocked. The downloaded example archive is served independently. Source rebuilds use npm ci to install pinned dependencies; this installation requires a network connection. Original DocSearch, StackBlitz, ads/analytics and external media remain hosted services; this test does not claim they work offline.'};
const check=(name,pass,detail)=>{const record={name,pass,detail};report.checks.push(record);if(!pass)report.failures.push(record);};
async function htmlPages(directory){
 let count=0;
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.isDirectory())count+=await htmlPages(path.join(directory,entry.name));
  else if(entry.name.endsWith('.html'))count++;
 }
 return count;
}
async function checkShippedServer(browser,serverRoot,label){
 let child,serverPage,stdout='',stderr='';
 try{
  const reservation=http.createServer();
  const port=await new Promise((resolve,reject)=>{
   reservation.once('error',reject);
   reservation.listen(0,'127.0.0.1',()=>{const assigned=reservation.address().port;reservation.close(error=>error?reject(error):resolve(assigned));});
  });
  const serverOrigin='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:serverRoot,env:{...process.env,PORT:String(port)},detached:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>{stdout=(stdout+chunk.toString()).slice(-4000);});
  child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-4000);});
  await new Promise((resolve,reject)=>{
   const finish=error=>{clearTimeout(timer);child.stdout.off('data',ready);child.off('error',failed);child.off('exit',exited);error?reject(error):resolve();};
   const ready=()=>{if(stdout.includes(serverOrigin))finish();};
   const failed=error=>finish(error);
   const exited=code=>finish(new Error('Shipped server exited before readiness: '+code+' '+stderr));
   const timer=setTimeout(()=>finish(new Error('Shipped server readiness timed out: '+stderr)),10000);
   child.stdout.on('data',ready);child.once('error',failed);child.once('exit',exited);
  });
  serverPage=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'light'});
  const errors=[],missing=[],cssResponses=[];
  serverPage.on('pageerror',error=>errors.push(error.message));
  serverPage.on('response',response=>{
   if(new URL(response.url()).origin!==serverOrigin)return;
   if(response.status()>=400)missing.push(response.status()+' '+response.url());
   if(new URL(response.url()).pathname==='/docs/5.3/examples/cover/cover.css')cssResponses.push({status:response.status(),url:response.url()});
  });
  await serverPage.route('**/*',route=>{
   if(new URL(route.request().url()).origin===serverOrigin)route.continue();
   else{report.hostedServices.push({url:route.request().url(),resourceType:route.request().resourceType(),status:'Intentionally blocked during shipped-server relocation check'});route.abort();}
  });
  const slashless='/docs/5.3/examples/cover',query='?preview=1&label=cover%20example',canonical=slashless+'/'+query;
  for(const method of ['GET','HEAD']){
   const response=await serverPage.request.fetch(serverOrigin+slashless+query,{method,maxRedirects:0});
   const detail={method,status:response.status(),location:response.headers().location,expectedLocation:canonical,bodyBytes:(await response.body()).length};
   check(label+' shipped server redirects slashless directories and preserves the query ('+method+')',detail.status===308&&detail.location===canonical&&detail.bodyBytes===0,detail);
  }
  const canonicalResponse=await serverPage.request.get(serverOrigin+canonical,{maxRedirects:0});
  check(label+' shipped server serves canonical directory URLs without a redirect loop',canonicalResponse.status()===200&&!canonicalResponse.headers().location&&canonicalResponse.headers()['content-type']?.includes('text/html'),{status:canonicalResponse.status(),location:canonicalResponse.headers().location??null});
  await serverPage.goto(serverOrigin+slashless+query,{waitUntil:'networkidle'});
  const css=await serverPage.evaluate(()=>{
   const link=document.querySelector('link[href="cover.css"]');
   const rules=link?.sheet?[...link.sheet.cssRules].map(rule=>({selector:rule.selectorText??null,maxWidth:rule.style?.maxWidth??null})):[];
   const container=document.querySelector('.cover-container');
   return {url:location.href,stylesheetUrl:link?.href??null,stylesheetLoaded:!!link?.sheet,nativeCoverRule:rules.some(rule=>rule.selector==='.cover-container'&&rule.maxWidth==='42em'),computedMaxWidth:container?getComputedStyle(container).maxWidth:null};
  });
  check(label+' shipped server resolves and loads native relative Cover CSS after a slashless visit',css.url===serverOrigin+canonical&&css.stylesheetUrl===serverOrigin+slashless+'/cover.css'&&css.stylesheetLoaded&&css.nativeCoverRule&&cssResponses.some(response=>response.status===200)&&errors.length===0&&missing.length===0,{...css,cssResponses,errors,missingLocalRequests:missing});
 }catch(error){check(label+' actual shipped-server directory and relative-asset checks',false,{error:error.message,stdout,stderr});}
 finally{
  if(serverPage)await serverPage.close().catch(()=>{});
  if(child&&child.exitCode===null&&child.signalCode===null)await new Promise(resolve=>{
   const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);
   child.once('exit',()=>{clearTimeout(timer);resolve();});
   child.kill();
  });
 }
}
const bytes=await readFile(path.join(root,'release',filename));
report.archives.push({file:filename,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
let extracted=false;
try{
 execFileSync('tar',['-xf',path.join(root,'release',filename),'-C',folder]);
 extracted=true;
 check('Complete ZIP extracts',true);
 const entries=execFileSync('tar',['-tf',path.join(root,'release',filename)],{encoding:'utf8',maxBuffer:16*1024*1024}).split(/\r?\n/).filter(Boolean).map(entry=>entry.replaceAll('\\','/'));
 const forbidden=entries.filter(entry=>/^tq-bootstrap\/(?:site|snippets|brightspace|tests\/results|assets\/tq)\//.test(entry)||/^tq-bootstrap\/examples\/(?:website|app|lesson|brightspace-host)\.html$/.test(entry)||entry.includes('/node_modules/')||/\/(?:tq-enhancements|tq-bootstrap\.bundle)/.test(entry));
 check('Archive contains only the current Bootstrap scope',forbidden.length===0,{entries:entries.length,forbidden});
}catch(error){check('Complete ZIP extracts',false,{error:error.message});}

if(extracted){
 const cwd=path.join(folder,'tq-bootstrap');
 let servingRoot=cwd;
 const downloadedRoots=new Map();
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon','.zip':'application/zip'};
 const server=http.createServer(async(req,res)=>{
  try{
   let target=path.resolve(servingRoot,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
   if(target!==servingRoot&&!target.startsWith(servingRoot+path.sep)){res.writeHead(403).end();return;}
   if((await stat(target)).isDirectory())target=path.join(target,'index.html');
   res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});
   res.end(await readFile(target));
  }catch{res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'light'});
 const errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===origin)requests.push(response.status()+' '+response.url());});
 await page.route('**/*',route=>{
  if(new URL(route.request().url()).origin===origin)route.continue();
  else{report.hostedServices.push({url:route.request().url(),resourceType:route.request().resourceType(),status:'Intentionally blocked while testing local framework independence; hosted functionality is not evaluated'});route.abort();}
 });
 const checkLightHeader=async label=>{
  await page.evaluate(()=>{document.documentElement.dataset.bsTheme='light';});
  const details=await page.evaluate(()=>{
   const header=document.querySelector('.bd-navbar');
   if(!header)return {missingHeader:true};
   const style=getComputedStyle(header);
   const layers=['::before','::after'].map(pseudo=>{
    const layer=getComputedStyle(header,pseudo);
    return {pseudo,content:layer.content,background:layer.backgroundColor,image:layer.backgroundImage};
   }).filter(layer=>layer.content!=='none'&&layer.content!=='normal');
   const links=[...header.querySelectorAll('.navbar-nav .nav-link:not(.active)')].filter(link=>link.textContent.trim()&&link.getBoundingClientRect().width&&link.getBoundingClientRect().height).map(link=>({text:link.textContent.trim().replace(/\s+/g,' '),color:getComputedStyle(link).color}));
   return {bodyBackground:getComputedStyle(document.body).backgroundColor,headerBackground:style.backgroundColor,headerImage:style.backgroundImage,layers,links};
  });
  const white='rgb(255, 255, 255)',clear='rgba(0, 0, 0, 0)';
  const whitePaint=image=>image==='none'||(image.startsWith('linear-gradient(')&&[...image.matchAll(/rgba?\(([^)]+)\)/g)].length>=2&&[...image.matchAll(/rgba?\(([^)]+)\)/g)].every(match=>match[1].split(',').slice(0,3).every(channel=>Number(channel.trim())===255)));
  const charcoalPaint=color=>{const channels=color.match(/[\d.]+/g)?.map(Number);return channels?.[0]===55&&channels?.[1]===50&&channels?.[2]===52&&(channels[3]??1)>=.8;};
  const nativeGradientPreserved=details.layers.some(layer=>layer.image.startsWith('linear-gradient('));
  const pass=!details.missingHeader&&details.bodyBackground===white&&[white,clear].includes(details.headerBackground)&&whitePaint(details.headerImage)&&details.layers.every(layer=>[white,clear].includes(layer.background)&&whitePaint(layer.image))&&nativeGradientPreserved&&details.links.length>0&&details.links.every(link=>charcoalPaint(link.color));
  check('Relocated '+label+' retains native header gradient geometry with white paint and readable charcoal navigation',pass,{...details,nativeGradientPreserved});
 };
 try{
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.locator('h1').first().waitFor();
  await checkLightHeader('Bootstrap homepage');
  await page.goto(origin+'/docs/5.3/components/modal/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.bootstrap?.Modal==='function');
  await checkLightHeader('Bootstrap documentation');
  const trigger=page.locator('.bd-content [data-bs-toggle="modal"]:visible').first();const target=await trigger.getAttribute('data-bs-target');await trigger.click();
  await page.locator(target+'.show').waitFor();
  await page.locator(target+' [data-bs-dismiss="modal"]').first().click();
  await page.locator(target+'.show').waitFor({state:'hidden'});
  check('Relocated local framework and original Bootstrap modal work independently of hosted services',errors.length===0&&requests.length===0,{errors,missingLocalRequests:requests,hostedRequestsBlocked:report.hostedServices.length});
 }catch(error){check('Relocated local framework and original Bootstrap modal work independently of hosted services',false,{error:error.message,errors,missingLocalRequests:requests,hostedRequestsBlocked:report.hostedServices.length});}
 try{
  await page.setViewportSize({width:320,height:900});
  await page.goto(origin+'/docs/5.3/components/modal/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.TQAccessibility?.init==='function'&&[...document.querySelectorAll('.table-responsive')].some(el=>el.scrollWidth>el.clientWidth+1&&el.tabIndex===0&&el.getAttribute('role')==='region'&&Boolean(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))));
  const table=page.locator('.table-responsive').first();
  const prepared=await table.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus();return document.activeElement===previous});
  await page.keyboard.press('Tab');
  const reached=await table.evaluate(el=>document.activeElement===el);
  const before=await table.evaluate(el=>{el.scrollLeft=0;return el.scrollLeft});
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(before=>document.querySelector('.table-responsive').scrollLeft>before,before,{timeout:3000});
  const detail=await table.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,scrollLeft:el.scrollLeft,tabindex:el.getAttribute('tabindex'),role:el.getAttribute('role'),label:el.getAttribute('aria-label'),focused:document.activeElement===el}));
  check('Relocated accessibility companion supplies actual named table Tab and Arrow scrolling with external requests blocked',prepared&&reached&&detail.focused&&detail.scrollLeft>before&&errors.length===0&&requests.length===0,{...detail,before,actualTabReached:reached,errors,missingLocalRequests:requests,hostedRequestsBlocked:report.hostedServices.length});
 }catch(error){check('Relocated accessibility companion supplies actual named table Tab and Arrow scrolling with external requests blocked',false,{error:error.message,errors,missingLocalRequests:requests});}
 finally{await page.setViewportSize({width:1440,height:900});}
 try{
  const inventory=JSON.parse(await readFile(path.join(cwd,'release/downloads.json'),'utf8'));
  const expected={
   dist:{file:'tq-bootstrap-1.0.0-dist.zip',prefix:'tq-bootstrap-dist',required:['README.txt','css/bootstrap.min.css','css/bootstrap.rtl.min.css','js/bootstrap.bundle.min.js',...companionFiles.map(file=>'tq/'+file),'dist/BOOTSTRAP-LICENSE.txt','dist/POPPER-LICENSE.txt'],css:'css/bootstrap.min.css'},
   source:{file:'tq-bootstrap-1.0.0-source.zip',prefix:'tq-bootstrap-source',required:['README.txt','package.json','package-lock.json','scripts/build.mjs','scripts/build-downloads.mjs','scripts/serve.mjs','scripts/publish-docs.mjs','src/scss/_tokens.scss','src/js/tq-accessibility.js','upstream/bootstrap/scss/bootstrap.scss','upstream/bootstrap/js/index.esm.js','upstream/bootstrap/dist/js/bootstrap.bundle.min.js','upstream/bootstrap/package.json','upstream/bootstrap-source/.browserslistrc','upstream/bootstrap/LICENSE','docs-source/package.json','docs-source/package-lock.json','docs-source/config.yml','docs-source/build-tq-docs.mjs','docs-source/site/astro.config.ts','docs-source/site/data/examples.yml','docs-source/site/static/docs/[version]/assets/js/color-modes.js','docs-source/site/src/content/docs/getting-started/download.mdx','docs-source/scss/bootstrap.scss','docs-source/build/postcss.config.mjs','THIRD-PARTY-NOTICES.md']},
   examples:{file:'tq-bootstrap-1.0.0-examples.zip',prefix:'tq-bootstrap-examples',required:['README.txt','scripts/serve.mjs','docs/5.3/examples/album/index.html','docs/5.3/examples/dashboard/index.html','docs/5.3/dist/css/bootstrap.min.css','docs/5.3/dist/js/bootstrap.bundle.min.js',...companionFiles.map(file=>'docs/5.3/dist/tq/'+file),'docs/5.3/assets/js/color-modes.js','source/examples/album/index.astro','dist/BOOTSTRAP-LICENSE.txt','dist/POPPER-LICENSE.txt','THIRD-PARTY-NOTICES.md'],css:'docs/5.3/dist/css/bootstrap.min.css'}
  };
  check('Relocated native download manifest describes exactly three independent archives',inventory.downloads.length===3&&Object.keys(expected).every(kind=>inventory.downloads.filter(item=>item.kind===kind).length===1));
  await page.goto(origin+'/docs/5.3/getting-started/download/',{waitUntil:'networkidle'});
  for(const [kind,definition]of Object.entries(expected)){
   try{
    const route='/release/'+definition.file;
    const item=inventory.downloads.find(record=>record.kind===kind);
    if(!item||item.url!==route||item.file!==definition.file)throw new Error('Missing or incorrect independent download manifest entry');
    const link=page.locator('.bd-content a[href="'+route+'"]');
    if(await link.count()!==1)throw new Error('Expected exactly one native content download control for '+route);
    const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);
    const downloaded=path.join(folder,definition.file);
    await download.saveAs(downloaded);
    if(await download.failure())throw new Error(await download.failure());
    const body=await readFile(downloaded),hash=sha(body);
    const entries=execFileSync('tar',['-tf',downloaded],{encoding:'utf8',maxBuffer:32*1024*1024}).split(/\r?\n/).filter(Boolean).map(entry=>entry.replaceAll('\\','/'));
    if(entries.some(entry=>!entry.startsWith(definition.prefix+'/')||entry.split('/').includes('..')||entry.includes(':')))throw new Error('Unsafe or unexpected ZIP entry path');
    const extraction=path.join(folder,'download-'+kind);
    await mkdir(extraction,{recursive:true});
    execFileSync('tar',['-xf',downloaded,'-C',extraction]);
    const archiveRoot=path.join(extraction,definition.prefix);
    const expectedEntries=item.entries.map(entry=>entry.name).sort();
    const differences=[];
    if(JSON.stringify([...entries].sort())!==JSON.stringify(expectedEntries))differences.push('Archive entry names differ from its inventory');
    for(const entry of item.entries){const extractedBody=await readFile(path.join(extraction,entry.name));if(extractedBody.length!==entry.bytes||sha(extractedBody)!==entry.sha256)differences.push(entry.name);}
    const missing=definition.required.filter(name=>!entries.includes(definition.prefix+'/'+name));
    const recursive=entries.filter(name=>/\.zip$/i.test(name));
    const cssMatches=definition.css?(await readFile(path.join(archiveRoot,definition.css))).equals(await readFile(path.join(cwd,'dist/css/bootstrap.min.css'))):true;
    const detail={kind,route,filename:download.suggestedFilename(),sha256:hash,bytes:body.length,entries:entries.length,contentMismatches:differences,missingRequiredEntries:missing,nestedArchives:recursive,currentFrameworkCssMatches:cssMatches};
    report.downloads.push(detail);
    check('Native '+kind+' download works after relocation and every extracted entry matches its inventory',detail.filename===definition.file&&hash===item.sha256&&body.length===item.bytes&&differences.length===0&&missing.length===0&&recursive.length===0&&cssMatches,detail);
    if(differences.length===0&&missing.length===0)downloadedRoots.set(kind,archiveRoot);
   }catch(error){check('Native '+kind+' download works after relocation and every extracted entry matches its inventory',false,{error:error.message});}
  }
  if(downloadedRoots.has('examples')){
   const errorStart=errors.length,requestStart=requests.length;
   servingRoot=downloadedRoots.get('examples');
   await page.goto(origin+'/docs/5.3/examples/album/',{waitUntil:'networkidle'});
   await page.locator('.navbar-toggler').click();
   await page.locator('#navbarHeader.show').waitFor();
   await page.locator('.navbar-toggler').click();
   await page.locator('#navbarHeader.show').waitFor({state:'hidden'});
   check('Downloaded example archive independently serves local assets and native collapse with external requests blocked',errors.length===errorStart&&requests.length===requestStart,{errors:errors.slice(errorStart),missingLocalRequests:requests.slice(requestStart)});
   await page.goto(origin+'/docs/5.3/examples/carousel/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>typeof window.TQAccessibility?.init==='function'&&document.querySelector('[data-tq-carousel-rotation]')?.textContent==='Play slides');
   const rotation=page.locator('[data-tq-carousel-rotation]').first();
   await rotation.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus()});
   await page.keyboard.press('Tab');
   const reached=await rotation.evaluate(el=>document.activeElement===el);
   await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('[data-tq-carousel-rotation]')?.textContent==='Pause slides');
   await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('[data-tq-carousel-rotation]')?.textContent==='Play slides');
   check('Downloaded example archive independently initializes paused companion carousel and keyboard Play/Pause',reached&&await rotation.evaluate(el=>document.activeElement===el)&&errors.length===errorStart&&requests.length===requestStart,{actualTabReached:reached,controlText:await rotation.textContent(),errors:errors.slice(errorStart),missingLocalRequests:requests.slice(requestStart)});
   servingRoot=cwd;
  }
 }catch(error){check('Relocated native download controls and standalone examples',false,{error:error.message,errors,missingLocalRequests:requests});}
 await checkShippedServer(browser,cwd,'Relocated complete release');
 if(downloadedRoots.has('examples'))await checkShippedServer(browser,downloadedRoots.get('examples'),'Downloaded examples archive');
 else check('Downloaded examples archive actual shipped-server checks are available',false,{error:'The examples archive did not pass extraction and inventory checks'});
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
 if(process.env.TQ_CLEAN_REBUILD!=='0'){
  for(const [label,buildRoot]of [['Complete release source',cwd],...(downloadedRoots.has('source')?[['Downloaded compact source',downloadedRoots.get('source')]]:[])])try{
   execFileSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--no-audit','--no-fund'],{cwd:buildRoot,stdio:'pipe',shell:process.platform==='win32',timeout:180000});
   execFileSync(process.execPath,['scripts/build.mjs'],{cwd:buildRoot,stdio:'pipe',timeout:180000});
   const manifest=JSON.parse(await readFile(path.join(root,'dist/manifest.json'),'utf8'));
   const differences=[];
   for(const file of manifest.files){const original=await readFile(path.join(root,file.path)),rebuilt=await readFile(path.join(buildRoot,file.path));if(!original.equals(rebuilt))differences.push(file.path);}
   check(label+' clean installation and deterministic distribution rebuild',differences.length===0,{files:manifest.files.length,differences});
   if(label==='Downloaded compact source'){
    try{
    execFileSync(process.platform==='win32'?'npm.cmd':'npm',['--prefix','docs-source','ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:buildRoot,stdio:'pipe',shell:process.platform==='win32',timeout:300000});
    execFileSync(process.execPath,['docs-source/build-tq-docs.mjs'],{cwd:buildRoot,stdio:'pipe',timeout:300000});
    const docsOutput=path.join(buildRoot,'docs-source/site/dist');
    const pageCount=await htmlPages(docsOutput);
    const rebuiltDownloads=JSON.parse(await readFile(path.join(docsOutput,'release/downloads.json'),'utf8'));
    const downloadDifferences=[];
    const kinds=rebuiltDownloads.downloads.map(download=>download.kind).sort();
    for(const download of rebuiltDownloads.downloads){
     const body=await readFile(path.join(docsOutput,'release',download.file));
     if(body.length!==download.bytes||sha(body)!==download.sha256)downloadDifferences.push(download.file+' checksum differs');
     const entries=execFileSync('tar',['-tf',path.join(docsOutput,'release',download.file)],{encoding:'utf8',maxBuffer:32*1024*1024}).split(/\r?\n/).filter(Boolean).map(entry=>entry.replaceAll('\\','/'));
     if(JSON.stringify([...entries].sort())!==JSON.stringify(download.entries.map(entry=>entry.name).sort()))downloadDifferences.push(download.file+' entry inventory differs');
     const forbidden=entries.filter(entry=>/\.zip$/i.test(entry)||/\/(?:node_modules|\.cache|\.astro)\//.test(entry)||(download.kind==='source'&&/\/docs-source\/(?:dist|site\/(?:dist|public))\//.test(entry)));
     if(forbidden.length)downloadDifferences.push({file:download.file,forbidden});
    }
    check('Downloaded compact source clean-builds the complete documentation and three independent downloads',pageCount===176&&JSON.stringify(kinds)===JSON.stringify(['dist','examples','source'])&&downloadDifferences.length===0,{htmlPages:pageCount,expectedHtmlPages:176,downloadKinds:kinds,downloadDifferences});
    }catch(error){check('Downloaded compact source clean-builds the complete documentation and three independent downloads',false,{error:error.message,output:String(error.stdout||'').slice(-3000),stderr:String(error.stderr||'').slice(-2000)});}
   }
  }catch(error){check(label+' clean installation and deterministic distribution rebuild',false,{error:error.message,output:String(error.stdout||'').slice(-3000),stderr:String(error.stderr||'').slice(-2000)});}
 }
}
report.summary={checks:report.checks.length,passed:report.checks.filter(item=>item.pass).length,failed:report.failures.length};
const reportFile=process.env.TQ_PORTABILITY_REPORT||'release/package-portability.json';
await mkdir(path.dirname(reportFile),{recursive:true});
await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
if(reportFile!=='release/package-portability.json')await cp(reportFile,'release/package-portability.json');
console.log(JSON.stringify(report.summary));
if(report.failures.length){console.error(JSON.stringify(report.failures,null,2));process.exitCode=1;}
