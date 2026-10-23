import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scriptPath='scripts/build-example-previews.mjs';
const packageJson=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const version=packageJson.dependencies.bootstrap.split('.').slice(0,2).join('.');
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198';
const origin=new URL(base).origin;
const examplesPath=`docs/${version}/examples`;
const imagePath='docs-source/site/static/docs/[version]/example-previews';
const outputPath=process.env.TQ_REPORT_PATH||'qa/results/example-previews.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const scales=[{suffix:'',scale:1/3,width:480,height:300},{suffix:'@2x',scale:2/3,width:960,height:600}];
async function files(directory){const result=[];for(const item of await fs.readdir(path.join(root,directory),{withFileTypes:true})){const name=path.posix.join(directory,item.name);if(item.isDirectory())result.push(...await files(name));else result.push(name);}return result.sort();}
async function fingerprint(){
  const entries=(await Promise.all([examplesPath,`docs/${version}/dist/css`,`docs/${version}/dist/js`,`docs/${version}/dist/tq`,`docs/${version}/assets`].map(files))).flat();
  return Object.fromEntries(await Promise.all(entries.sort().map(async name=>[name,sha(await fs.readFile(path.join(root,name)))])));
}
function pngDimensions(bytes){if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG signature');return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
async function settleFonts(page){return page.evaluate(async()=>{
  const quietMs=750,timeoutMs=8000,started=performance.now();
  await document.fonts.ready;
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  function read(){
    const fonts=new Map(),textGeometry=[];
    const animated=document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations===Infinity).map(animation=>animation.effect.target).filter(Boolean);
    for(const element of [document.body,...document.body.querySelectorAll('*')]){
      if(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE'].includes(element.tagName))continue;
      const nodes=[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      if(!nodes.length)continue;
      const style=getComputedStyle(element),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      let entry=fonts.get(font);if(!entry){entry={glyphs:new Set(),sample:''};fonts.set(font,entry);}
      for(const node of nodes){const text=node.textContent.trim(),added=[...new Set(text)].filter(character=>!entry.glyphs.has(character));if(added.length)entry.sample+=text.slice(0,512)+added.join('');for(const character of text)entry.glyphs.add(character);
        // Native spinning/animated subtrees keep running. Their moving rectangles
        // do not describe font stability; their glyphs are still measured above.
        if(!animated.some(target=>target===element||target.contains(element))){const range=document.createRange();range.selectNodeContents(node);textGeometry.push([font,...[...range.getClientRects()].map(rect=>[rect.x,rect.y,rect.width,rect.height])]);}
      }
    }
    const metrics=[];
    for(const[font,entry]of fonts){context.font=font;const measured=context.measureText(entry.sample);metrics.push([font,[...entry.glyphs].sort().join(''),measured.width,measured.actualBoundingBoxAscent,measured.actualBoundingBoxDescent]);}
    return{signature:JSON.stringify([metrics,textGeometry]),fonts:fonts.size,animatedSubtrees: animated.length};
  }
  let previous='',quietSince=performance.now(),samples=0,changes=0,last;
  while(performance.now()-started<timeoutMs){await new Promise(resolve=>requestAnimationFrame(resolve));last=read();samples++;if(last.signature!==previous||document.fonts.status!=='loaded'){quietSince=performance.now();changes++;}previous=last.signature;if(performance.now()-quietSince>=quietMs)return{fonts:last.fonts,quietMs,elapsedMs:performance.now()-started,samples,changes,nativeAnimatedSubtrees:last.animatedSubtrees};await new Promise(resolve=>setTimeout(resolve,60));}
  throw Error(`Native text/font geometry did not settle for ${quietMs}ms within ${timeoutMs}ms`);
});}
const pages=[],aliases=[];
for(const item of await fs.readdir(path.join(root,examplesPath),{withFileTypes:true}))if(item.isDirectory()){
  const name=path.posix.join(examplesPath,item.name,'index.html');
  try{const contents=await fs.readFile(path.join(root,name),'utf8');if(/http-equiv=["']refresh["']/i.test(contents))aliases.push(item.name);else pages.push({id:item.name,path:name,sha256:sha(contents)});}catch(error){if(error.code!=='ENOENT')throw error;}
}
pages.sort((a,b)=>a.id.localeCompare(b.id));
if(pages.length!==40)throw Error(`Expected all 40 native example pages, found ${pages.length}`);
const publicationOutputs=[`${examplesPath}/index.html`,...pages.flatMap(page=>scales.map(scale=>`docs/${version}/assets/img/examples/${page.id}${scale.suffix}.png`))].sort();
const publicationOutputSet=new Set(publicationOutputs);
const captureInputs=inventory=>Object.fromEntries(Object.entries(inventory).filter(([name])=>!publicationOutputSet.has(name)));
if(process.argv.includes('--verify')){
  const report=JSON.parse(await fs.readFile(path.join(root,outputPath),'utf8'));
  const failures=[];
  if(report.summary?.findings!==0||report.summary?.images!==80||report.summary?.pages!==40||!report.summary?.assetsFrozen)failures.push('Capture report is incomplete');
  if(report.scriptSHA256!==sha(await fs.readFile(fileURLToPath(import.meta.url))))failures.push('Capture script changed since measurement');
  if(JSON.stringify(report.pages.map(({id,path,sha256})=>({id,path,sha256})))!==JSON.stringify(pages))failures.push('Example page inventory changed');
  const current=await fingerprint();
  if(JSON.stringify(report.publicationOutputs)!==JSON.stringify(publicationOutputs))failures.push('Expected publication-output boundary changed');
  if(JSON.stringify(captureInputs(current))!==JSON.stringify(report.sourceInputHashes)||JSON.stringify(captureInputs(report.assetsAtStart))!==JSON.stringify(report.sourceInputHashes)||JSON.stringify(captureInputs(report.assetsAtEnd))!==JSON.stringify(report.sourceInputHashes))failures.push('Actual captured HTML/CSS/JS/artwork input inventory changed');
  const expectedFiles=pages.flatMap(page=>scales.map(scale=>`${page.id}${scale.suffix}.png`)).sort();
  const actualFiles=(await fs.readdir(path.join(root,imagePath))).sort();
  if(JSON.stringify(actualFiles)!==JSON.stringify(expectedFiles))failures.push('Preview directory does not contain exactly the expected 80 PNGs');
  if(JSON.stringify(report.images.map(image=>path.posix.basename(image.path)).sort())!==JSON.stringify(expectedFiles))failures.push('Recorded preview inventory does not match all 80 expected files');
  for(const image of report.images){try{if(image.path!==path.posix.join(imagePath,path.posix.basename(image.path)))throw Error('Unexpected source PNG path');const bytes=await fs.readFile(path.join(root,image.path)),dimensions=pngDimensions(bytes),scale=scales[image.path.endsWith('@2x.png')?1:0];if(sha(bytes)!==image.sha256||bytes.length!==image.bytes||dimensions.width!==scale.width||dimensions.height!==scale.height||image.width!==scale.width||image.height!==scale.height||image.deviceScaleFactor!==scale.scale||image.paint.theme!=='light'||image.paint.primary!=='#e31b23')failures.push('Preview differs: '+image.path);}catch(error){failures.push(image.path+': '+error.message);}}
  console.log(JSON.stringify({suite:report.suite,mode:'verify',pages:pages.length,images:report.images.length,captureInputFiles:Object.keys(captureInputs(current)).length,publicationOutputs:publicationOutputs.length,failures,pass:failures.length===0},null,2));
  if(failures.length)process.exitCode=1;
  process.exit();
}

const report={suite:'Gallery previews rendered from actual TQ Bootstrap example pages',started:new Date().toISOString(),bootstrapVersion:packageJson.dependencies.bootstrap,docsVersion:version,browser:'Chromium',viewport:{width:1440,height:900},theme:'light',scriptSHA256:sha(await fs.readFile(fileURLToPath(import.meta.url))),method:'Native viewport PNG screenshots of all 40 served TQ example pages at 1440×900 CSS pixels. Device scale factors 1/3 and 2/3 produce 480×300 and 960×600 files without raster editing or CSS scaling. The original theme script resolves the light colour scheme. Warm actual text glyphs in an unattached canvas and require a 750ms quiet window of native text/font metrics; native animated subtrees keep running and only their moving rectangles are excluded from the font stability signature. Wait for visible images, native Chart/Masonry initialization and settled chart geometry. Pause native carousels and select their first slide only. No CSS, HTML, artwork, photos, fonts, geometry or other application behavior is replaced.',limitations:['Previews show the initial 1440×900 desktop viewport in light mode, including native fixed controls. They do not show every section or interactive state.','Original Bootstrap logos, artwork and photographs retain their original colours. Native decorative image content is not a framework colour token.','Remote original dependencies are fetched as their actual bytes and fulfilled at their original browser URLs; original SRI attributes remain enforced. Their exact byte hashes are recorded.','Verification checks recorded PNG bytes/dimensions and frozen source inventory without recapturing or claiming cross-platform pixel identity. Native spinners and other infinite animation continue; previews capture an actual native frame.'],pages,aliases,images:[],findings:[],dependencies:[],assetsAtStart:await fingerprint()};
report.publicationOutputs=publicationOutputs;
report.sourceInputHashes=captureInputs(report.assetsAtStart);
report.sourceInventoryBoundary='The complete before/after asset inventory is retained as historical capture evidence. Ongoing --verify binds all actual capture inputs and all 80 source PNGs. Only the exact gallery index and 80 compiled gallery-thumbnail output paths are excluded from capture-input comparison: none is requested by any captured page, and these outputs are intentionally updated during publication. No recorded hashes are rebound.';
const cache=new Map(),dependencies=new Map();
async function remote(url,request,pageId){
  if(!cache.has(url))cache.set(url,(async()=>{
    const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error(`Remote HTTP ${response.status}: ${url}`);
    const body=Buffer.from(await response.arrayBuffer());
    const record={url,finalURL:response.url,status:response.status,bytes:body.length,sha256:sha(body),contentType:response.headers.get('content-type')||'application/octet-stream',resourceTypes:[],pages:[],integrity:[]};
    dependencies.set(url,record);
    return{body,contentType:record.contentType};
  })());
  const result=await cache.get(url),record=dependencies.get(url);
  if(!record.resourceTypes.includes(request.resourceType()))record.resourceTypes.push(request.resourceType());
  if(!record.pages.includes(pageId))record.pages.push(pageId);
  return result;
}
await fs.mkdir(path.join(root,imagePath),{recursive:true});
const browser=await chromium.launch({headless:true});
report.browserVersion=browser.version();
try{
  for(const scale of scales){
    const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:scale.scale,colorScheme:'light'});
    await context.addInitScript(()=>{try{localStorage.setItem('theme','light');}catch{}});
    for(const example of pages){
      const page=await context.newPage(),errors=[],failedRequests=[],badResponses=[],requests=[],dependencyErrors=[];
      page.setDefaultTimeout(15000);
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>requests.push({url:request.url(),type:request.resourceType()}));
      page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
      page.on('response',response=>{if(response.status()>=400)badResponses.push({url:response.url(),status:response.status()});});
      await page.route('**/*',async route=>{
        const request=route.request(),url=request.url();
        if(new URL(url).origin===origin)return route.continue();
        try{const result=await remote(url,request,example.id);return route.fulfill({body:result.body,contentType:result.contentType,headers:{'access-control-allow-origin':'*'}});}catch(error){dependencyErrors.push(error.message);return route.abort('failed');}
      });
      try{
        const url=base+`/docs/${version}/examples/${example.id}/`,response=await page.goto(url,{waitUntil:'load',timeout:45000});
        if(response.status()!==200||sha(await response.body())!==example.sha256)throw Error('Served example HTML does not match its frozen source');
        await page.waitForFunction(()=>window.bootstrap&&document.documentElement.dataset.bsTheme==='light');
        const integrityResources=await page.locator('script[integrity],link[integrity]').evaluateAll(nodes=>nodes.map(el=>({url:el.src||el.href,integrity:el.integrity})));
        for(const resource of integrityResources){if(new URL(resource.url).origin===origin)continue;const result=await cache.get(resource.url),record=dependencies.get(resource.url);if(!result||!record)throw Error('Integrity-protected dependency was not captured: '+resource.url);const matches=resource.integrity.split(/\s+/).some(token=>{const index=token.indexOf('-'),algorithm=token.slice(0,index);return['sha256','sha384','sha512'].includes(algorithm)&&createHash(algorithm).update(result.body).digest('base64')===token.slice(index+1);});if(!record.integrity.some(item=>item.value===resource.integrity))record.integrity.push({value:resource.integrity,matches});if(!matches)throw Error('Original remote dependency SRI failed: '+resource.url);}
        const carouselState=await page.evaluate(()=>[...document.querySelectorAll('.carousel')].map(el=>{const instance=bootstrap.Carousel.getOrCreateInstance(el);instance.pause();instance.to(0);return{id:el.id,items:el.querySelectorAll('.carousel-item').length};}));
        if(carouselState.length){await page.waitForFunction(()=>[...document.querySelectorAll('.carousel')].every(el=>!el.querySelector('.carousel-item-next,.carousel-item-prev,.carousel-item-start,.carousel-item-end')&&el.querySelector('.carousel-item')?.classList.contains('active')));await page.evaluate(()=>document.querySelectorAll('.carousel').forEach(el=>bootstrap.Carousel.getInstance(el).pause()));}
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForFunction(()=>[...document.images].every(img=>{const r=img.getBoundingClientRect(),visible=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;return!visible||(img.complete&&img.naturalWidth>0);}));
        let chart=null,masonry=null;
        if(example.id.startsWith('dashboard')){
          await page.waitForFunction(()=>{const el=document.getElementById('myChart'),chart=window.Chart?.getChart(el);if(!chart)return false;const points=chart.getDatasetMeta(0).data.map(p=>[p.x,p.y]),current=JSON.stringify(points);window.__previewChartStable=window.__previewChartPoints===current?(window.__previewChartStable||0)+1:0;window.__previewChartPoints=current;return window.__previewChartStable>=6&&points.length===7;},{},{polling:'raf'});
          chart=await page.evaluate(()=>{const el=document.getElementById('myChart'),instance=Chart.getChart(el);return{version:Chart.version,points:instance.getDatasetMeta(0).data.length,width:el.width,height:el.height,lineColour:instance.data.datasets[0].borderColor};});
        }
        if(example.id==='masonry'){
          await page.waitForFunction(()=>window.Masonry&&Masonry.data(document.querySelector('[data-masonry]')));
          masonry=await page.evaluate(()=>{const el=document.querySelector('[data-masonry]'),instance=Masonry.data(el),rects=instance.items.map(item=>item.element.getBoundingClientRect()),overlaps=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([i,j]);}return{items:instance.items.length,height:el.getBoundingClientRect().height,absoluteItems:instance.items.filter(item=>getComputedStyle(item.element).position==='absolute').length,overlaps};});
          if(!masonry.items||masonry.absoluteItems!==masonry.items||masonry.overlaps.length)throw Error('Native Masonry layout has not settled');
        }
        const fontSettling=await settleFonts(page);
        const paint=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement),body=getComputedStyle(document.body);return{theme:document.documentElement.dataset.bsTheme,direction:document.documentElement.dir||'ltr',devicePixelRatio,primary:style.getPropertyValue('--bs-primary').trim(),bodyColour:style.getPropertyValue('--bs-body-color').trim(),bodyBackground:style.getPropertyValue('--bs-body-bg').trim(),actualBodyColour:body.color,actualBodyBackground:body.backgroundColor};});
        if(paint.theme!=='light'||paint.primary!=='#e31b23')throw Error('Preview did not use the actual TQ light palette');
        const runtime={fonts:await page.evaluate(()=>({status:document.fonts.status,faces:[...document.fonts].map(font=>({family:font.family,status:font.status,weight:font.weight}))})),fontSettling,chart,masonry,carousels:await page.evaluate(()=>[...document.querySelectorAll('.carousel')].map(el=>({id:el.id,activeIndex:[...el.querySelectorAll('.carousel-item')].findIndex(item=>item.classList.contains('active')),intervalRunning:Boolean(bootstrap.Carousel.getInstance(el)?._interval)})))};
        if(runtime.carousels.some(item=>item.activeIndex!==0||item.intervalRunning))throw Error('Carousel was not paused on its native first slide');
        if(errors.length||dependencyErrors.length||badResponses.length||failedRequests.length)throw Error(JSON.stringify({errors,dependencyErrors,badResponses,failedRequests}));
        const png=await page.screenshot({type:'png',fullPage:false,animations:'allow'}),dimensions=pngDimensions(png);
        if(dimensions.width!==scale.width||dimensions.height!==scale.height)throw Error('Native screenshot dimensions differ from the intended thumbnail');
        const target=path.posix.join(imagePath,example.id+scale.suffix+'.png');
        await fs.writeFile(path.join(root,target),png);
        const requestedLocalFiles={};
        for(const request of requests){const parsed=new URL(request.url);if(parsed.origin===origin){const local=decodeURIComponent(parsed.pathname.slice(1));if(publicationOutputSet.has(local))throw Error('A publication output was unexpectedly used as an actual capture input: '+local);if(/\.(?:css|js)(?:$|\?)/.test(parsed.pathname)){if(!Object.hasOwn(report.sourceInputHashes,local))throw Error('Requested CSS/JS was absent from the frozen source inventory: '+local);requestedLocalFiles[local]=report.sourceInputHashes[local];}}}
        report.images.push({id:example.id,density:scale.suffix?'2x':'1x',path:target,url,sourceHTML:{path:example.path,sha256:example.sha256},sourceCSSAndJS:requestedLocalFiles,...dimensions,deviceScaleFactor:scale.scale,bytes:png.length,sha256:sha(png),paint,runtime,requests});
        console.log(`${example.id}${scale.suffix}: ${dimensions.width}×${dimensions.height}, ${png.length} bytes`);
      }catch(error){report.findings.push({id:example.id,density:scale.suffix?'2x':'1x',error:error.message,errors,failedRequests,badResponses,dependencyErrors});console.log('FAIL '+example.id+scale.suffix+': '+error.message);}
      finally{await page.close();}
    }
    await context.close();
  }
}finally{await browser.close();}
report.dependencies=[...dependencies.values()].sort((a,b)=>a.url.localeCompare(b.url));
for(const dependency of report.dependencies){dependency.pages.sort();dependency.resourceTypes.sort();}
report.assetsAtEnd=await fingerprint();
const assetsFrozen=JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd);
if(!assetsFrozen)report.findings.push({error:'Existing example HTML/CSS/JS/artwork assets changed while previews were captured'});
if(report.scriptSHA256!==sha(await fs.readFile(fileURLToPath(import.meta.url))))report.findings.push({error:'Capture script changed during capture'});
report.finished=new Date().toISOString();
report.summary={pages:pages.length,images:report.images.length,expectedImages:80,dimensions:scales.map(({width,height})=>({width,height})),observedSourceFiles:Object.keys(report.assetsAtStart).length,captureInputFiles:Object.keys(report.sourceInputHashes).length,publicationOutputs:publicationOutputs.length,dependencies:report.dependencies.length,findings:report.findings.length,assetsFrozen};
await fs.writeFile(path.join(root,outputPath),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
if(report.findings.length||report.images.length!==80)process.exitCode=1;
