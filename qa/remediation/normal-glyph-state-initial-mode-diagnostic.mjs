import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base='http://127.0.0.1:5198'
const tag=process.env.TQ_NORMAL_GLYPH_TAG||'baseline',out=path.join(root,'qa/results/remediation'),pictures=`normal-glyph-${tag}`
const routes=['components/close-button','components/alerts','components/modal','components/navbar','components/accordion','components/carousel','examples/carousel']
const files=['qa/remediation/normal-glyph-state.mjs','dist/css/bootstrap.min.css','dist/js/bootstrap.bundle.min.js','dist/tq/tq-accessibility.min.js',...routes.map(route=>`docs/5.3/${route}/index.html`)]
for(const route of routes)for(const match of(await fs.readFile(path.join(root,`docs/5.3/${route}/index.html`),'utf8')).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)){const url=new URL(match[1],`${base}/docs/5.3/${route}/`);if(url.origin===base&&!files.includes(url.pathname.slice(1)))files.push(url.pathname.slice(1))}
const sha=value=>createHash('sha256').update(value).digest('hex'),hashes=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])))
const report={suite:'Normal-mode essential glyphs and selected states on supported reading hosts and actual Bootstrap pages',started:new Date().toISOString(),inputsAtStart:await hashes(),observations:[],findings:[],errors:[],notes:['Each resting/hover/focus pixel sample is compared with the same actual host after temporarily hiding only the essential glyph or indicator fill, with native dimensions and backgrounds preserved; all original inline styles are restored immediately. Screenshots and effective ancestor opacity are recorded.','Controlled close-host fixtures use the shipped native CSS/JavaScript. Explicit white/dark panels set their corresponding native data-bs-theme; legacy white close variants are tested on supported dark panels only. Actual alert/modal, navbar, accordion and Carousel markup is not replaced.','Pixel contrast uses the dominant changed full-paint sample; antialiased edge pixels are not treated as the authored solid ink. Three-engine normal paint evidence is distinct from operating-system forced-colour or assistive-technology verification.']}
await fs.mkdir(path.join(out,pictures),{recursive:true})
function png(buffer){let offset=8,width,height,channels,chunks=[];while(offset<buffer.length){const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),data=buffer.subarray(offset+8,offset+8+length);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);if(data[8]!==8||data[12])throw Error('Unsupported PNG');channels=data[9]===6?4:data[9]===2?3:0}if(type==='IDAT')chunks.push(data);offset+=length+12}if(!channels)throw Error('Unsupported channels');const packed=zlib.inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c};for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const filter=packed[y*(stride+1)],a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(packed[y*(stride+1)+x+1]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255}return{width,height,at:(x,y)=>[...pixels.subarray((y*width+x)*channels,(y*width+x)*channels+3)]}}
const luminance=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
const fixture=theme=>`<!doctype html><html lang="en" data-bs-theme="${theme}"><head><meta charset="utf-8"><title>Native close supported-host fixture</title><link rel="stylesheet" href="${base}/dist/css/bootstrap.min.css"></head><body class="p-4"><h1 class="h3">Native close reading hosts</h1><button id="sentinel" tabindex="-1">Focus sentinel</button>${['bg-body','bg-body-secondary','bg-body-tertiary','bg-white','bg-dark'].map(host=>`<div class="p-4 my-2 ${host}" ${host==='bg-white'?'data-bs-theme="light"':host==='bg-dark'?'data-bs-theme="dark"':''}><button type="button" id="close-${host}" class="btn-close" aria-label="Close ${host}"></button>${host==='bg-dark'?'<button type="button" id="legacy-white" class="btn-close btn-close-white" aria-label="Legacy white close"></button>':''}</div>`).join('')}<script src="${base}/dist/js/bootstrap.bundle.min.js"></script></body></html>`
async function measure(page,element,info,kind='background'){
 await element.scrollIntoViewIfNeeded()
 const original=await element.getAttribute('style')
 const before=await element.boundingBox()
 const paint=await element.evaluate((el,kind)=>{const style=getComputedStyle(el),chain=[];let opacity=1;for(let node=el;node;node=node.parentElement){const current=getComputedStyle(node),value=Number(current.opacity);opacity*=value;if(value!==1)chain.push({tag:node.tagName,classes:node.className,opacity:value})}return{backgroundImage:style.backgroundImage,backgroundColor:style.backgroundColor,filter:style.filter,effectiveOpacity:opacity,opacityChain:chain,after:kind==='accordion'?{image:getComputedStyle(el,'::after').backgroundImage,filter:getComputedStyle(el,'::after').filter}:null}},kind)
 const actual=await element.screenshot({animations:'disabled'}),a=png(actual)
 await element.evaluate((el,kind)=>{if(kind==='accordion'){el.style.setProperty('--bs-accordion-btn-icon','none');el.style.setProperty('--bs-accordion-btn-active-icon','none')}else if(kind==='indicator')el.style.setProperty('background-color','transparent','important');else el.style.setProperty('background-image','none','important')},kind)
 const hidden=await element.screenshot({animations:'disabled'}),b=png(hidden),after=await element.boundingBox()
 await element.evaluate((el,original)=>{if(original===null)el.removeAttribute('style');else el.setAttribute('style',original)},original)
 const pairs=new Map()
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const ink=a.at(x,y),host=b.at(x,y);if(ink.some((v,i)=>Math.abs(v-host[i])>3)){const key=`${ink.join(',')}|${host.join(',')}`;pairs.set(key,(pairs.get(key)||0)+1)}}
 const dominant=[...pairs].sort((a,b)=>b[1]-a[1])[0],colours=dominant?.[0].split('|').map(value=>value.split(',').map(Number)),ratio=colours?contrast(...colours):1
 const id=[info.browser,info.theme,info.route.replaceAll('/','-'),info.name,info.state].join('-').replaceAll(/[^a-zA-Z0-9_-]/g,'_'),screenshot=`${pictures}/${id}.png`
 await fs.writeFile(path.join(out,screenshot),actual)
 const observation={...info,...paint,ratio,ink:colours?.[0],host:colours?.[1],dominantPixels:dominant?.[1]||0,changedPixels:[...pairs.values()].reduce((a,b)=>a+b,0),geometryUnchanged:JSON.stringify(before)===JSON.stringify(after),screenshot,pass:ratio>=3&&Boolean(dominant)&&JSON.stringify(before)===JSON.stringify(after)}
 report.observations.push(observation);if(!observation.pass)report.findings.push(observation)
 return observation
}
async function states(page,control,surface,info,kind='background'){
 for(const state of ['rest','hover','focus']){
  await control.evaluate(el=>el.blur());await page.mouse.move(1,1)
  if(state==='hover')await control.hover()
  if(state==='focus'){await control.focus();await page.keyboard.press('Shift');await page.keyboard.press('Shift')}
  await measure(page,surface,{...info,state},kind)
 }
}
for(const [name,engine]of Object.entries({chromium,firefox,webkit}).filter(([name])=>(process.env.TQ_NORMAL_GLYPH_BROWSERS||'chromium,firefox,webkit').split(',').includes(name))){
 const browser=await engine.launch()
 for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:theme,reducedMotion:'reduce'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort())
  await context.route(`${base}/qa/remediation/normal-glyph-fixture`,route=>route.fulfill({contentType:'text/html',body:fixture(theme)}))
  const page=await context.newPage();page.setDefaultTimeout(8000)
  const visit=async route=>{await page.goto(route==='fixture'?`${base}/qa/remediation/normal-glyph-fixture`:`${base}/docs/5.3/${route}/`,{waitUntil:'load'});await page.evaluate(theme=>{document.documentElement.setAttribute('data-bs-theme',theme)},theme)}
  try{
   await visit('fixture')
   for(const id of ['close-bg-body','close-bg-body-secondary','close-bg-body-tertiary','close-bg-white','close-bg-dark','legacy-white']){const control=page.locator(`#${id}`);await states(page,control,control,{browser:name,theme,route:'fixture',name:id})}
   await visit('components/alerts')
   for(const [index,control]of(await page.locator('.bd-content .alert .btn-close').all()).entries())await states(page,control,control,{browser:name,theme,route:'components/alerts',name:`alert-close-${index}`})
   await visit('components/modal')
   const trigger=page.locator('.bd-content [data-bs-toggle="modal"]').filter({visible:true}).first();await trigger.click();await page.locator('.modal.show').waitFor();const close=page.locator('.modal.show .btn-close').first();await states(page,close,close,{browser:name,theme,route:'components/modal',name:'live-modal-close'});await page.keyboard.press('Escape')
   await page.setViewportSize({width:390,height:1000});await visit('components/navbar')
   for(const [index,control]of(await page.locator('.bd-content .navbar-toggler').all()).entries()){if(!await control.isVisible())continue;await states(page,control,control.locator('.navbar-toggler-icon'),{browser:name,theme,route:'components/navbar',name:`menu-${index}`})}
   await page.setViewportSize({width:1440,height:1000});await visit('components/accordion')
   for(const [index,control]of(await page.locator('.bd-content .accordion-button').all()).entries()){if(index>=6)break;await control.scrollIntoViewIfNeeded();if(await control.getAttribute('aria-expanded')==='true')await control.click();await measure(page,control,{browser:name,theme,route:'components/accordion',name:`accordion-${index}`,state:'collapsed'},'accordion');await control.click();await measure(page,control,{browser:name,theme,route:'components/accordion',name:`accordion-${index}`,state:'expanded'},'accordion')}
   for(const route of ['components/carousel','examples/carousel']){
    await visit(route)
    for(const [index,control]of(await page.locator('.carousel-control-prev,.carousel-control-next').all()).entries())await states(page,control,control.locator('.carousel-control-prev-icon,.carousel-control-next-icon'),{browser:name,theme,route,name:`arrow-${index}`})
    const indicators=[]
    for(const [index,control]of(await page.locator('.carousel-indicators button').all()).entries()){await control.evaluate(el=>el.blur());await page.mouse.move(1,1);indicators.push(await measure(page,control,{browser:name,theme,route,name:`indicator-${index}`,state:await control.evaluate(el=>el.classList.contains('active'))?'active':'inactive'},'indicator'))}
    for(const active of indicators.filter(item=>item.state==='active')){const inactive=indicators.find(item=>item.state==='inactive'&&item.ink&&JSON.stringify(item.host)===JSON.stringify(active.host));if(inactive){const ratio=contrast(active.ink,inactive.ink),observation={browser:name,theme,route,name:`${active.name}-selected-difference`,state:'active-versus-inactive',ratio,activeInk:active.ink,inactiveInk:inactive.ink,pass:ratio>=3};report.observations.push(observation);if(!observation.pass)report.findings.push(observation)}}
   }
  }catch(error){report.errors.push({browser:name,theme,error:error.stack});console.log(JSON.stringify(report.errors.at(-1)))}
  await context.close()
 }
 await browser.close()
}
report.finished=new Date().toISOString();report.inputsAtEnd=await hashes();report.summary={observations:report.observations.length,passed:report.observations.filter(item=>item.pass).length,findings:report.findings.length,errors:report.errors.length,inputsFrozen:JSON.stringify(report.inputsAtStart)===JSON.stringify(report.inputsAtEnd)}
await fs.writeFile(path.join(out,`normal-glyph-state-${tag}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary))
if(report.findings.length||report.errors.length||!report.summary.inputsFrozen)process.exitCode=1
