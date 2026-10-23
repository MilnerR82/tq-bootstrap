import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198'
const folder=path.join(root,'.cache/remediation-20261022/browser-zoom'),extension=path.join(folder,'extension'),profile=path.join(folder,'profile-'+Date.now())
const sha=b=>createHash('sha256').update(b).digest('hex')
const final=process.argv.includes('--final')
let routes=final?['/','/docs/5.3/utilities/spacing/','/docs/5.3/components/buttons/','/docs/5.3/components/modal/','/docs/5.3/forms/validation/','/docs/5.3/examples/checkout/','/docs/5.3/examples/dashboard/','/docs/5.3/examples/navbars/']:['/docs/5.3/utilities/spacing/?tq-zoom-probe=1']
if(process.env.TQ_ZOOM_ROUTES)routes=routes.filter(route=>process.env.TQ_ZOOM_ROUTES.split(',').includes(route))
const themes=final?['light','dark']:['light']
const report={suite:'Actual Chromium browser zoom via isolated QA extension',started:new Date().toISOString(),method:'Temporary MV3 extension in an isolated headless Chromium persistent profile uses chrome.tabs.setZoom/getZoom. This is browser page zoom, not CSS transform, a 320px viewport substitution, or device emulation. A 1296px native outer window leaves 1280px content after the measured 16px window frame. Record actual zoom, CSS/physical viewport metrics, CDP Page.getLayoutMetrics, keyboard state and screenshots.',profile,extension,physicalWindow:{outerWidth:1296,height:1000,expectedContentWidth:1280},checks:[],visits:[],findings:[],limitations:['This run is limited to Chromium in an isolated headless profile. It is not a Safari/VoiceOver, NVDA or text-only browser-resize assessment.','A real 400% zoom measurement does not by itself establish complete-page reflow or all keyboard-workflow conformance.']}
report.final=final;report.diagnostic=Boolean(process.env.TQ_ZOOM_ROUTES);report.routes=routes;report.themes=themes;report.assetsAtStart={}
async function recordFile(file){const b=await fs.readFile(path.join(root,file));report.assetsAtStart[file]=sha(b);return b}
await recordFile('qa/remediation/browser-zoom.mjs')
for(const route of routes){const file=new URL(route,base).pathname.replace(/^\//,'')+'index.html',html=(await recordFile(file)).toString();for(const m of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"]+)"/g)){const url=new URL(m[1],new URL(route,base));if(url.origin===new URL(base).origin&&/\.(?:css|js|png|svg|jpe?g|webp|ico)$/.test(url.pathname))await recordFile(decodeURIComponent(url.pathname).replace(/^\//,''))}}
async function recordScripts(dir){for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())await recordScripts(file);else if(/\.(?:css|js)$/.test(file))await recordFile(file)}}
await recordScripts('docs/5.3/assets')
let currentVisit={}
const check=(name,pass,evidence={})=>{report.checks.push({...currentVisit,name,pass:!!pass,...evidence});if(!pass)report.findings.push({...currentVisit,name,...evidence})}
const metrics=async page=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,devicePixelRatio,actualTheme:document.documentElement.dataset.bsTheme,screen:{width:screen.width,height:screen.height},visualViewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale},document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,scrollHeight:document.documentElement.scrollHeight},title:document.title}))
async function keyboardReach(page,element){const prepared=await element.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);if(!previous)return false;previous.focus();return document.activeElement===previous});if(!prepared)return false;await page.keyboard.press('Tab');return element.evaluate(el=>document.activeElement===el)}
async function essentialReflow(page){return page.evaluate(()=>{
 const width=document.documentElement.clientWidth,findings=[],exceptions=new Map(),counts={textNodes:0,glyphRects:0,controls:0}
 const selector=element=>{const parts=[];for(let el=element;el&&el.nodeType===1;el=el.parentElement){if(el.id){parts.unshift('#'+CSS.escape(el.id));break}const siblings=el.parentElement?[...el.parentElement.children].filter(n=>n.tagName===el.tagName):[el];parts.unshift(el.tagName.toLowerCase()+(siblings.length>1?`:nth-of-type(${siblings.indexOf(el)+1})`:''))}return parts.join(' > ')}
 const visible=element=>{const style=getComputedStyle(element);return element.getClientRects().length&&style.display!=='none'&&style.visibility!=='hidden'&&!element.closest('script,style,noscript,svg,[aria-hidden="true"],.visually-hidden')&&!(element.closest('.visually-hidden-focusable')&&!element.closest('.visually-hidden-focusable').matches(':focus-within'))}
 const overflow=rect=>rect.left<-.75||rect.right>width+.75
 const containedException=element=>{const host=element.closest('pre,.table-responsive');if(!host)return false;const style=getComputedStyle(host),rect=host.getBoundingClientRect();if(!['auto','scroll'].includes(style.overflowX)||host.scrollWidth<=host.clientWidth+1)return false;if(overflow(rect))return false;const key=selector(host);if(!exceptions.has(key))exceptions.set(key,{selector:key,kind:host.matches('pre')?'contained preformatted code':'contained data table',overflowX:style.overflowX,tabindex:host.getAttribute('tabindex'),role:host.getAttribute('role'),label:host.getAttribute('aria-label'),labelledby:host.getAttribute('aria-labelledby'),clientWidth:host.clientWidth,scrollWidth:host.scrollWidth,rect:rect.toJSON(),textNodes:0,controls:0});return exceptions.get(key)}
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT)
 for(let node;node=walker.nextNode();){const element=node.parentElement;if(!element||!node.textContent.trim()||!visible(element))continue;counts.textNodes++;const range=document.createRange(),raw=node.textContent;range.setStart(node,raw.search(/\S/));range.setEnd(node,raw.length-raw.match(/\s*$/)[0].length);const rects=[...range.getClientRects()].filter(r=>r.width&&r.height);counts.glyphRects+=rects.length;if(!rects.some(overflow))continue;const exception=containedException(element);if(exception){exception.textNodes++;continue}findings.push({type:'text glyph extends outside horizontal viewport',selector:selector(element),text:node.textContent.trim().slice(0,200),rects:rects.filter(overflow).map(r=>r.toJSON())})}
 for(const element of document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],summary')){if(!visible(element))continue;counts.controls++;const rect=element.getBoundingClientRect();if(!overflow(rect))continue;const exception=containedException(element);if(exception){exception.controls++;continue}findings.push({type:'control extends outside horizontal viewport',selector:selector(element),label:(element.getAttribute('aria-label')||element.textContent||element.getAttribute('placeholder')||'').trim().slice(0,160),rect:rect.toJSON()})}
 const outlyingContainers=[...document.querySelectorAll('body,.container,.container-fluid,main,.row')].filter(visible).map(el=>({selector:selector(el),rect:el.getBoundingClientRect().toJSON()})).filter(item=>overflow(item.rect))
 return{width,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:width},counts,findings,containedScrollExceptions:[...exceptions.values()],outlyingContainers,classification:findings.length?'essential horizontal content requires review':document.documentElement.scrollWidth>width+1?'document width exceeds viewport; measured glyphs and controls remain reachable':'document width and essential content fit'}
})}
async function provePartialCopyTarget(page,finding){
 const button=page.locator(finding.selector)
 if(!await button.evaluate(el=>el.matches('button.btn-clipboard')))return{pass:false,reason:'No exact verified operation for this partially exposed control.'}
 await page.evaluate(()=>{if(!window.__tqZoomCopy){window.__tqZoomCopy={events:0};document.addEventListener('copy',()=>window.__tqZoomCopy.events++)}})
 const before=await page.evaluate(()=>window.__tqZoomCopy.events)
 const reached=await keyboardReach(page,await button.elementHandle())
 await page.keyboard.press('Enter')
 await page.waitForFunction(count=>window.__tqZoomCopy.events>count&&document.querySelector('[data-tq-clipboard-status]')?.textContent==='Code copied to clipboard.',before)
 await page.waitForFunction(el=>{const r=el.getBoundingClientRect(),x=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2;return document.activeElement===el&&r.bottom>0&&r.top<innerHeight&&el.contains(document.elementFromPoint(x,y))},await button.elementHandle())
 const keyboard=await button.evaluate(el=>{const rect=el.getBoundingClientRect(),x=(Math.max(0,rect.left)+Math.min(innerWidth,rect.right))/2,y=(Math.max(0,rect.top)+Math.min(innerHeight,rect.bottom))/2;return{focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),centerExposed:el.contains(document.elementFromPoint(x,y)),rect:rect.toJSON(),status:document.querySelector('[data-tq-clipboard-status]').textContent,copyEvents:window.__tqZoomCopy.events,scrollX}})
 await button.evaluate(el=>{const rect=el.getBoundingClientRect();window.scrollTo({left:0,top:scrollY+rect.top-100,behavior:'instant'})})
 const exposed=await button.evaluate(el=>{const rect=el.getBoundingClientRect(),left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom),x=(left+right)/2,y=(top+bottom)/2;return{rect:rect.toJSON(),width:right-left,height:bottom-top,center:{x,y},centerExposed:el.contains(document.elementFromPoint(x,y)),icons:[...el.querySelectorAll('svg,img')].map(n=>n.getBoundingClientRect().toJSON()),viewport:innerWidth,scrollX}})
 await page.mouse.click(exposed.center.x,exposed.center.y)
 await page.waitForFunction(count=>window.__tqZoomCopy.events>count&&document.querySelector('[data-tq-clipboard-status]')?.textContent==='Code copied to clipboard.',keyboard.copyEvents)
 const pointer=await button.evaluate(el=>({focused:document.activeElement===el,status:document.querySelector('[data-tq-clipboard-status]').textContent,copyEvents:window.__tqZoomCopy.events}))
 const pass=reached&&keyboard.focused&&keyboard.focusVisible&&keyboard.centerExposed&&pointer.focused&&exposed.width>=24&&exposed.height>=24&&exposed.centerExposed&&exposed.icons.length>0&&exposed.icons.every(r=>r.left>=0&&r.right<=exposed.viewport)&&keyboard.scrollX===0&&exposed.scrollX===0
 return{pass,method:'Measure the actual exposed target and entire icon, then execute native keyboard and exposed-area pointer copy with status/focus confirmation. Retain original outer-box overhang; no fixed pixel waiver.',keyboardReached:reached,keyboard,exposed,pointer}
}
async function workflow(page,route,label){
 const events=[]
 for(let i=0;i<3;i++){await page.keyboard.press('Tab');events.push(await page.evaluate(()=>({tag:document.activeElement.tagName,label:(document.activeElement.getAttribute('aria-label')||document.activeElement.textContent).trim().slice(0,120),rect:document.activeElement.getBoundingClientRect().toJSON()})))}
 if(route.includes('/buttons/')){
  const button=page.locator('.bd-content .bd-example .btn').first()
  const before=await button.evaluate(el=>{const s=getComputedStyle(el);return{outline:s.outlineStyle,outlineWidth:s.outlineWidth,shadow:s.boxShadow,border:s.borderColor,background:s.backgroundColor}})
  const reachable=await keyboardReach(page,await button.elementHandle())
  await page.waitForTimeout(200)
  const after=await button.evaluate(el=>{const s=getComputedStyle(el);return{focusVisible:el.matches(':focus-visible'),outline:s.outlineStyle,outlineWidth:s.outlineWidth,shadow:s.boxShadow,border:s.borderColor,background:s.backgroundColor}})
  const indicator=after.focusVisible&&((after.outline!=='none'&&parseFloat(after.outlineWidth)>0)||(after.shadow!=='none'&&after.shadow!==before.shadow)||after.border!==before.border||after.background!==before.background)
  check(label+' base button reachable by actualTab',reachable,{before,after});check(label+' base button has visible focus indicator',indicator,{before,after})
 }
 if(route.includes('/modal/')){
  await page.locator('[data-bs-target="#exampleModalLive"]').click()
  await page.waitForFunction(()=>document.querySelector('#exampleModalLive')?.classList.contains('show')&&document.querySelector('#exampleModalLive')?.contains(document.activeElement))
  await page.keyboard.press('Tab');const trapped=await page.locator('#exampleModalLive').evaluate(el=>el.contains(document.activeElement))
  check(label+' native modal traps keyboard focus at actualzoom',trapped,{rect:await page.locator('#exampleModalLive').evaluate(el=>el.getBoundingClientRect().toJSON())})
  await page.evaluate(()=>{const modal=document.querySelector('#exampleModalLive');modal.dataset.tqQaHidden='false';modal.addEventListener('hidden.bs.modal',()=>modal.dataset.tqQaHidden='true',{once:true})})
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#exampleModalLive')?.dataset.tqQaHidden==='true'&&!document.body.classList.contains('modal-open')&&!document.querySelector('.modal-backdrop'))
 }
 if(route.includes('/validation/')||route.includes('/checkout/')){
  const form=page.locator('form.needs-validation').first();await form.locator('[type=submit]').click()
  const summary=form.locator('[data-tq-validation-summary]')
  await summary.waitFor({state:'visible'})
  await page.evaluate(()=>window.__tqQaScrollState=null)
  await page.waitForFunction(el=>{const rect=el.getBoundingClientRect(),signature=[scrollX,scrollY,rect.top,rect.height].join('|');const state=window.__tqQaScrollState||{signature:null,frames:0};state.frames=state.signature===signature?state.frames+1:0;state.signature=signature;window.__tqQaScrollState=state;return document.activeElement===el&&rect.bottom>0&&rect.top<innerHeight&&state.frames>=4},await summary.elementHandle(),{timeout:5000})
  const state=await summary.evaluate(el=>({focused:document.activeElement===el,rect:el.getBoundingClientRect().toJSON(),text:el.textContent.trim(),visibleHeight:Math.max(0,Math.min(el.getBoundingClientRect().bottom,innerHeight)-Math.max(el.getBoundingClientRect().top,0))}))
  check(label+' invalid form focuses visible persistent summary',state.focused&&state.visibleHeight>0,state)
 }
 if(route.includes('/dashboard/')){
  const summary=page.locator('details summary').first()
  if(await summary.evaluate(el=>el.parentElement.open)){await summary.focus();await page.keyboard.press('Enter')}
  const reachable=await keyboardReach(page,await summary.elementHandle())
  await page.keyboard.press('Enter');const data=await page.locator('details table tbody td').allTextContents()
  check(label+' chart data accessible with keyboard at actualzoom',reachable&&data.length===7&&await summary.evaluate(el=>el.parentElement.open),{data})
 }
 if(route.includes('/navbars/')){
  const toggle=page.locator('.navbar-toggler:visible').first();await toggle.click();await page.waitForFunction(selector=>document.querySelector(selector)?.classList.contains('show'),await toggle.getAttribute('data-bs-target'))
  check(label+' responsive navigation opens at actualzoom',await toggle.getAttribute('aria-expanded')==='true')
  await toggle.click()
 }
 return events
}
await fs.mkdir(extension,{recursive:true});await fs.mkdir(path.join(root,'qa/results/screenshots'),{recursive:true})
await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'TQ isolated QA browser zoom',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1:5198/*'],background:{service_worker:'background.js'}},null,2))
await fs.writeFile(path.join(extension,'background.js'),"chrome.runtime.onInstalled.addListener(() => {});\n")
let context
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--window-size=1296,1000']})
 report.browserVersion=context.browser()?.version()||null
 let worker=context.serviceWorkers()[0]
 if(!worker)worker=await context.waitForEvent('serviceworker',{timeout:12000})
 report.extensionWorker=worker.url()
 const page=await context.newPage();page.setDefaultTimeout(12000)
 await page.goto(base+routes[0],{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready)
 const cdp=await context.newCDPSession(page)
 const tabId=await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url});if(tabs.length!==1)throw Error('Expected exact one QA tab, found'+tabs.length);return tabs[0].id},page.url())
 for(const route of routes)for(const theme of themes){
  await page.emulateMedia({colorScheme:theme});await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.evaluate(theme=>document.documentElement.dataset.bsTheme=theme,theme);await page.evaluate(()=>document.fonts.ready)
  const routeVisits=[]
  for(const zoom of [1,2,4]){
  const actual=await worker.evaluate(async({tabId,zoom})=>{await chrome.tabs.setZoomSettings(tabId,{mode:'automatic',scope:'per-tab'});await chrome.tabs.setZoom(tabId,zoom);return await chrome.tabs.getZoom(tabId)},{tabId,zoom})
  await page.waitForTimeout(500)
  const pageMetrics=await metrics(page)
  const layoutMetrics=await cdp.send('Page.getLayoutMetrics')
  const label=route+' '+theme+' '+Math.round(zoom*100)+'%'
  currentVisit={route,theme,requestedZoom:zoom,actualZoom:actual,width:pageMetrics.innerWidth,browser:'chromium'}
  let keyboard=[],workflowError=null
  if(final){try{keyboard=await workflow(page,route,label)}catch(error){workflowError=String(error);check(label+' workflow completes',false,{error:String(error)})}}else{await page.keyboard.press('Tab');keyboard=[await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim().slice(0,100),href:document.activeElement.getAttribute('href')}))]}
  const name=route==='/'?'home':route.replace(/^\/|\/$/g,'').replaceAll('/','-').replaceAll(/[^\w-]/g,'_')
  const screenshot=final?`qa/results/screenshots/actual-browser-zoom-${name}-${theme}-${Math.round(zoom*100)}.png`:`qa/results/screenshots/actual-browser-zoom-${Math.round(zoom*100)}.png`
  const reflow=final?await essentialReflow(page):null
  if(reflow){
   reflow.partialControlProofs=[]
   for(const finding of [...reflow.findings])if(finding.type==='control extends outside horizontal viewport'){
    let proof;try{proof=await provePartialCopyTarget(page,finding)}catch(error){proof={pass:false,error:String(error)}}
    reflow.partialControlProofs.push({finding,proof})
    if(proof.pass)reflow.findings.splice(reflow.findings.indexOf(finding),1)
   }
   if(!reflow.findings.length&&reflow.partialControlProofs.some(p=>p.proof.pass))reflow.classification='Outer control padding exceeds viewport; complete glyph, usable target and native operations verified without horizontal scrolling.'
  }
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const capture=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})
  const image=Buffer.from(capture.data,'base64');await fs.writeFile(path.join(root,screenshot),image)
  const screenshotCapture=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colours=new Set();let minimum=255,maximum=0,samples=0;for(let y=0;y<canvas.height;y+=8)for(let x=0;x<canvas.width;x+=8){const i=(y*canvas.width+x)*4;if(pixels[i+3]<255)continue;const colour=pixels.slice(i,i+3);colours.add([...colour].join(','));minimum=Math.min(minimum,...colour);maximum=Math.max(maximum,...colour);samples++}return{method:'CDP Page.captureScreenshot fromSurface:true, captureBeyondViewport:false, no CSS clipping',width:image.width,height:image.height,samples,distinctColours:colours.size,channelRange:maximum-minimum}},capture.data)
  const expectedPixels={width:Math.round(pageMetrics.visualViewport.width*pageMetrics.devicePixelRatio),height:Math.round(pageMetrics.visualViewport.height*pageMetrics.devicePixelRatio)}
  check(label+' actual zoom screenshot contains rendered content at physical viewport resolution',Math.abs(screenshotCapture.width-expectedPixels.width)<=1&&Math.abs(screenshotCapture.height-expectedPixels.height)<=1&&screenshotCapture.distinctColours>=8&&screenshotCapture.channelRange>=16,{screenshot,screenshotCapture,expectedPixels})
  const visit={route,theme,requestedZoom:zoom,actualZoom:actual,metrics:pageMetrics,layoutMetrics,afterWorkflowMetrics:await metrics(page),keyboard,workflowError,reflow,screenshot,screenshotCapture,screenshotSHA256:sha(image),png:{width:image.readUInt32BE(16),height:image.readUInt32BE(20)}}
  report.visits.push(visit);routeVisits.push(visit)
  check(label+' actualbrowserzoom',Math.abs(actual-zoom)<1e-10,{actual})
  if(final)check(label+' essential text and controls reflow within horizontal viewport',reflow.findings.length===0,{metrics:visit.afterWorkflowMetrics,reflow})
  }
  const baseline=routeVisits[0],zoom4=routeVisits[2]
  check(route+' '+theme+'1280pxcontent becomes320CSSpx at actual400%zoom',baseline.metrics.innerWidth===1280&&zoom4.metrics.innerWidth===320&&Math.abs(zoom4.actualZoom-4)<1e-10,{evidence:{baseline:baseline.metrics,zoom4:zoom4.metrics}})
 }
 report.status=report.checks.every(x=>x.pass)?final?'completed':'supported prototype':'mismatch; review evidence'
}catch(error){report.status='unavailable/pending';report.findings.push({error:String(error),stack:error.stack})}finally{await context?.close()}
report.assetsAtEnd={};for(const file of Object.keys(report.assetsAtStart))report.assetsAtEnd[file]=sha(await fs.readFile(path.join(root,file)))
report.assetsFrozen=JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd)
report.finished=new Date().toISOString();report.scriptSHA256=sha(await fs.readFile(fileURLToPath(import.meta.url)));report.summary={routes:routes.length,themes:themes.length,visits:report.visits.length,checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length,findings:report.findings.length,assetsFrozen:report.assetsFrozen}
const output=path.join(root,process.env.TQ_ZOOM_REPORT||(final?'qa/results/remediation/browser-zoom.json':'qa/results/remediation/browser-zoom-prototype.json'));await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:report.status,summary:report.summary,findings:report.findings.map(({name,error})=>({name,error}))}))
if(!['completed','supported prototype'].includes(report.status)||!report.assetsFrozen)process.exitCode=1





