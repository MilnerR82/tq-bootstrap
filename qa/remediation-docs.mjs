import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium, firefox, webkit } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198'
const runtime=process.argv.includes('--runtime')
const sha=b=>createHash('sha256').update(b).digest('hex')
let currentVisit={}
const report={suite:'Scoped accessible documentation markup and TQ installation remediation',started:new Date().toISOString(),checks:[],visits:[],findings:[],limits:['These scoped source/browser checks do not constitute a complete WCAG evaluation or an NVDA/Safari/VoiceOver run.','Numeric-opacity teaching fixtures use actual utility values on decorative blocks and normal-contrast readable labels. The explicitly inactive Reboot alpha link is identified separately. Contextual contrast requires its independent actual-page audit.','Public hosted upstream starter projects are labelled and are not submitted, published or tested here.'],sourceInputs:{},runtime}
function check(name,pass,evidence){report.checks.push({...currentVisit,name,pass:!!pass,evidence});if(!pass)report.findings.push({...currentVisit,name,evidence})}
async function readBytes(file){const bytes=await fs.readFile(path.join(root,file));report.sourceInputs[file]=sha(bytes);return bytes}
async function read(file){return(await readBytes(file)).toString()}
async function verifyScrollableTables(page,label,{resize=false,width}={}){
 await page.waitForFunction(()=>[...document.querySelectorAll('.table-responsive')].filter(el=>el.getClientRects().length).every(el=>{const overflow=el.scrollWidth>el.clientWidth+1&&['auto','scroll'].includes(getComputedStyle(el).overflowX);return !overflow||el.tabIndex===0&&el.getAttribute('role')==='region'&&(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))}))
 const tables=page.locator('.table-responsive'),count=await tables.count()
 check(label+': native responsive tables are present',count>0,{selector:'.table-responsive',count})
 let resizeIndex=null
 for(let index=0;index<count;index++){
  const table=tables.nth(index),state=await table.evaluate(el=>{const parts=[];for(let n=el;n&&n.nodeType===1;n=n.parentElement){if(n.id){parts.unshift('#'+CSS.escape(n.id));break}const siblings=n.parentElement?[...n.parentElement.children].filter(s=>s.tagName===n.tagName):[n];parts.unshift(n.tagName.toLowerCase()+(siblings.length>1?`:nth-of-type(${siblings.indexOf(n)+1})`:''))}return{selector:parts.join(' > '),visible:el.getClientRects().length>0,overflow:el.scrollWidth>el.clientWidth+1&&['auto','scroll'].includes(getComputedStyle(el).overflowX),tabindex:el.getAttribute('tabindex'),role:el.getAttribute('role'),label:el.getAttribute('aria-label'),labelledby:el.getAttribute('aria-labelledby'),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,direction:getComputedStyle(el).direction,source:el.getAttribute('data-tq-overflow-table-source')}})
  if(!state.visible)continue
  check(label+': only actual scrolling tables gain a named keyboard region',state.overflow?state.tabindex==='0'&&state.role==='region'&&Boolean(state.label||state.labelledby):state.tabindex===null&&state.role===null&&state.label===null&&state.labelledby===null,{selector:state.selector,tableIndex:index,state})
  if(!state.overflow)continue
  resizeIndex??=index
  const prepared=await table.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus();return document.activeElement===previous})
  if(prepared)await page.keyboard.press('Tab')
  const reached=prepared&&await table.evaluate(el=>document.activeElement===el)
  check(label+': actual Tab reaches responsive table',reached,{selector:state.selector,tableIndex:index})
  const before=await table.evaluate(el=>{el.scrollLeft=0;return el.scrollLeft})
  await page.keyboard.press(state.direction==='rtl'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(150)
  const after=await table.evaluate(el=>el.scrollLeft)
  check(label+': keyboard scrolls actual table columns',Math.abs(after-before)>0,{selector:state.selector,tableIndex:index,direction:state.direction,before,after})
 }
 if(resize&&resizeIndex!==null){
  const table=tables.nth(resizeIndex)
  await page.setViewportSize({width:1440,height:1000})
  await page.waitForFunction(el=>el.scrollWidth<=el.clientWidth+1&&!el.hasAttribute('tabindex')&&!el.hasAttribute('role')&&!el.hasAttribute('aria-label')&&!el.hasAttribute('aria-labelledby'),await table.elementHandle())
  check(label+': fitting table restores original absent focus and name attributes',true,{selector:'.table-responsive',tableIndex:resizeIndex,actualWidth:1440,state:await table.evaluate(el=>({tabindex:el.getAttribute('tabindex'),role:el.getAttribute('role'),label:el.getAttribute('aria-label'),client:el.clientWidth,scroll:el.scrollWidth}))})
  await page.setViewportSize({width,height:1000})
  await page.waitForFunction(el=>el.scrollWidth>el.clientWidth+1&&el.tabIndex===0&&el.getAttribute('role')==='region'&&Boolean(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')),await table.elementHandle())
  check(label+': returning to narrow layout restores named keyboard scrolling',true,{selector:'.table-responsive',tableIndex:resizeIndex,actualWidth:width})
 }
}
await read('qa/remediation-docs.mjs')
const manifestFile='qa/remediation-source/docs/edit-manifest.json'
const manifest=JSON.parse(await read(manifestFile))
for(const entry of manifest.files){
 const original=await readBytes(entry.beforeFile);let text=original.toString().replaceAll('\r\n','\n')
 let exact=sha(original)===entry.beforeSHA256
 for(const edit of entry.edits){const n=text.split(edit.before).length-1;exact&&=n===edit.count;text=text.replaceAll(edit.before,edit.after)}
 const produced=Buffer.from(entry.lineEndings==='CRLF'?text.replaceAll('\n','\r\n'):text)
 exact&&=sha(produced)===entry.afterSHA256
 check('Exact reversible source edit replay: '+entry.file,exact,{beforeSHA256:entry.beforeSHA256,afterSHA256:entry.afterSHA256,edits:entry.edits.length})
 await read(entry.file)
}
const expectedValues=[15339,21345,18483,24003,23489,24092,12034]
for(const name of ['dashboard','dashboard-rtl']){
 const js=await read(`docs-source/site/src/assets/examples/${name}/dashboard.js`)
 const source=await read(`docs-source/site/src/assets/examples/${name}/index.astro`)
 const values=js.match(/data:\s*\[([\s\S]*?)\]/)?.[1].match(/\d+/g)?.map(Number)
 const markup=source.slice(source.indexOf('<details'),source.indexOf('</details>')+10)
 const tableValues=[...markup.matchAll(/<td>([\d,]+)<\/td>/g)].map(m=>Number(m[1].replaceAll(',','')))
 check('Exact accessible chart-data alternative: '+name,JSON.stringify(values)===JSON.stringify(expectedValues)&&JSON.stringify(tableValues)===JSON.stringify(values)&&/role="img" aria-label="[^"]+" aria-describedby="chartDescription"/.test(source)&&/id="chartDescription"/.test(source)&&/<summary>[^<]+<\/summary>/.test(markup),{chartValues:values,tableValues})
}
for(const source of ['docs-source/site/src/components/home/MastHead.astro','docs-source/site/src/components/home/GetStarted.astro']){
 const text=await read(source)
 check('Homepage uses actual TQ download/files: '+source,!/npm (?:i|install) bootstrap/.test(text)&&/getConfig\(\)\.download\.dist/.test(text)&&/(stock|upstream).*colours/i.test(text),{})
}
if(runtime){
 for(const file of ['dist/css/bootstrap.min.css','dist/css/bootstrap.rtl.min.css','dist/js/bootstrap.bundle.min.js','dist/tq/tq-accessibility.min.js','docs/5.3/assets/js/color-modes.js','docs/5.3/utilities/spacing/index.html','docs/5.3/utilities/overflow/index.html','docs/5.3/components/buttons/index.html','docs/5.3/components/dropdowns/index.html','docs/5.3/components/modal/index.html',...['dashboard','dashboard-rtl','navbar-bottom','navbars','cheatsheet','cheatsheet-rtl','masonry','pricing'].map(name=>`docs/5.3/examples/${name}/index.html`),...['dashboard','dashboard-rtl'].map(name=>`docs/5.3/examples/${name}/dashboard.js`)]){
  const text=await read(file)
  if(file.endsWith('.html'))for(const m of text.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)){const url=new URL(m[1],base+'/'+file);if(url.origin===new URL(base).origin&&/\.(?:css|js)$/.test(url.pathname))await read(decodeURIComponent(url.pathname).replace(/^\//,''))}
 }
 for(const file of await fs.readdir(path.join(root,'docs/5.3/assets')))if(/\.(css|js)$/.test(file))await read('docs/5.3/assets/'+file)
}
const sourceAtStart={...report.sourceInputs}
if(runtime){
 for(const [engine,driver] of Object.entries({chromium,firefox,webkit})){
  const browser=await driver.launch({headless:true})
  try{for(const width of [320,390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme})
   await context.addInitScript(t=>{try{localStorage.setItem('theme',t)}catch{}},theme)
   const page=await context.newPage()
   const visit=async route=>{currentVisit={engine,width,theme,route};await page.goto(base+route,{waitUntil:'domcontentloaded'})}
   try{
    for(const name of ['dashboard','dashboard-rtl']){
     const route=`/docs/5.3/examples/${name}/`
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     const canvas=page.locator('#myChart'),summary=page.locator('details summary').first()
     const description=await canvas.getAttribute('aria-describedby')
     await summary.focus();await page.keyboard.press('Enter')
     const values=await page.locator('details table tbody td').allTextContents()
     const parsed=values.map(x=>Number(x.replaceAll(',','')))
     const named=await canvas.getAttribute('aria-label')
     const expanded=await summary.evaluate(s=>s.parentElement.open)
     check(`${engine}/${width}/${theme}/${name}: keyboard data disclosure and equivalent seven values`,named&&description==='chartDescription'&&expanded&&JSON.stringify(parsed)===JSON.stringify(expectedValues),{name:named,description,expanded,values})
     await page.keyboard.press('Enter')
     check(`${engine}/${width}/${theme}/${name}: native disclosure closes`,!(await summary.evaluate(s=>s.parentElement.open)),{})
     await verifyScrollableTables(page,`${engine}/${width}/${theme}/${name}`,{width})
     report.visits.push({engine,width,theme,route})
    }
    for(const route of ['/docs/5.3/components/modal/','/docs/5.3/examples/pricing/']){
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     await verifyScrollableTables(page,`${engine}/${width}/${theme}${route}`,{resize:width===320&&route.includes('/modal/'),width})
     report.visits.push({engine,width,theme,route})
    }
    for(const name of ['navbar-bottom','navbars']){
     const route=`/docs/5.3/examples/${name}/`
     await visit(route)
     const measured=await page.evaluate(()=>{
      const theme=document.querySelector('.bd-mode-toggle button'),themeBox=theme.getBoundingClientRect()
      return [...document.querySelectorAll('.navbar-toggler')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},overlap:Math.max(0,Math.min(r.right,themeBox.right)-Math.max(r.left,themeBox.left))*Math.max(0,Math.min(r.bottom,themeBox.bottom)-Math.max(r.top,themeBox.top)),centerExposed:cy<innerHeight&&cy>=0?e.contains(document.elementFromPoint(cx,cy)):null}})
     })
     check(`${engine}/${width}/${theme}/${name}: theme control does not overlap navbar openers`,measured.every(x=>x.overlap===0&&x.centerExposed!==false),{targets:measured})
     report.visits.push({engine,width,theme,route})
    }
    {
     const route='/docs/5.3/utilities/spacing/'
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     await page.waitForFunction(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].every(pre=>pre.scrollWidth<=pre.clientWidth+1||pre.tabIndex===0))
     const inventory=await page.evaluate(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].map(pre=>({overflow:pre.scrollWidth>pre.clientWidth+1||pre.scrollHeight>pre.clientHeight+1,tabindex:pre.getAttribute('tabindex'),role:pre.getAttribute('role'),label:pre.getAttribute('aria-label')})))
     check(`${engine}/${width}/${theme}: only overflowing PREs receive named keyboard regions`,inventory.length>0&&inventory.every(x=>x.overflow?x.tabindex==='0'&&x.role==='region'&&x.label:x.tabindex===null&&x.role===null),{regions:inventory})
     const pre=await page.$('.highlight > pre[data-tq-scrollable-code]')
     if(pre){
      const prepared=await pre.evaluate(pre=>{const candidates=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(el=>el.tabIndex>=0&&!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]')&&Boolean(el.compareDocumentPosition(pre)&Node.DOCUMENT_POSITION_FOLLOWING));const prior=candidates.at(-1);if(!prior)return false;prior.focus();return document.activeElement===prior})
      if(prepared){await page.keyboard.press('Tab');const focused=await pre.evaluate(el=>document.activeElement===el);check(`${engine}/${width}/${theme}: actual Tab reaches scrolling code`,focused,{})
       const before=await pre.evaluate(el=>{el.scrollLeft=0;return el.scrollLeft});await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);const after=await pre.evaluate(el=>el.scrollLeft);check(`${engine}/${width}/${theme}: keyboard scrolls code horizontally`,after>before,{before,after})
      }else check(`${engine}/${width}/${theme}: code keyboard fixture has preceding visible tabbable control`,false,{})
     }
     report.visits.push({engine,width,theme,route})
    }
    if(width===1440){
     const route='/docs/5.3/components/buttons/'
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     const before=await page.evaluate(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].map((el,index)=>({index,client:el.clientWidth,scroll:el.scrollWidth,tabindex:el.getAttribute('tabindex')})))
     const style=await page.addStyleTag({content:'pre,pre code,pre code *{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}'})
     await page.waitForFunction(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].every(pre=>pre.scrollWidth<=pre.clientWidth+1||pre.tabIndex===0))
     const after=await page.evaluate(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].map((el,index)=>({index,client:el.clientWidth,scroll:el.scrollWidth,tabindex:el.getAttribute('tabindex'),role:el.getAttribute('role'),label:el.getAttribute('aria-label')})))
     const newlyOverflowing=after.filter((el,index)=>before[index].scroll<=before[index].client+1&&el.scroll>el.client+1)
     check(`${engine}/${width}/${theme}: user text spacing creates named code overflow regions without PRE resize`,newlyOverflowing.length>0&&newlyOverflowing.every(el=>el.client===before[el.index].client&&el.tabindex==='0'&&el.role==='region'&&el.label),{route,before,after,newlyOverflowing})
     if(newlyOverflowing.length){
      const index=newlyOverflowing[0].index,pre=page.locator('.highlight[data-tq-code-label] > pre').nth(index)
      const prepared=await pre.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus();return document.activeElement===previous})
      if(prepared)await page.keyboard.press('Tab')
      check(`${engine}/${width}/${theme}: actual Tab reaches newly overflowing code after stylesheet injection`,prepared&&await pre.evaluate(el=>document.activeElement===el),{route,index})
     }
     await style.evaluate(el=>el.remove())
     await page.waitForFunction(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].every(pre=>pre.scrollWidth>pre.clientWidth+1||pre.scrollHeight>pre.clientHeight+1||!pre.hasAttribute('tabindex')))
     const restored=await page.evaluate(()=>[...document.querySelectorAll('.highlight[data-tq-code-label] > pre')].map((el,index)=>({index,client:el.clientWidth,scroll:el.scrollWidth,tabindex:el.getAttribute('tabindex')})))
     check(`${engine}/${width}/${theme}: removing user text spacing removes only obsolete scrolling Tab stops`,newlyOverflowing.every(el=>restored[el.index].scroll<=restored[el.index].client+1&&restored[el.index].tabindex===null),{route,restored})
     const copy=page.locator('.btn-clipboard').first()
     const clipboardSource=await copy.evaluate(el=>{const highlight=el.closest('.bd-code-snippet').querySelector('.highlight');return{html:highlight.innerHTML,text:highlight.textContent.trim()}})
     await page.evaluate(()=>{
      const probe=window.__tqClipboardProbe={commands:[],copyEvents:0,statusChanges:[]}
      const nativeCommand=document.execCommand
      document.execCommand=function(command,...args){
       const selected=document.activeElement instanceof HTMLTextAreaElement?document.activeElement.value:window.getSelection()?.toString()
       const result=nativeCommand.call(document,command,...args)
       if(command==='copy')probe.commands.push({command,selected,result})
       return result
      }
      document.addEventListener('copy',()=>probe.copyEvents++)
      const status=document.querySelector('[data-tq-clipboard-status]')
      new MutationObserver(()=>probe.statusChanges.push(status.textContent)).observe(status,{childList:true,characterData:true,subtree:true})
     })
     await copy.focus();await page.keyboard.press('Enter')
     await page.waitForFunction(()=>document.querySelector('[data-tq-clipboard-status]')?.textContent==='Code copied to clipboard.')
     const copied=await copy.evaluate(el=>({focused:document.activeElement===el,icon:el.querySelector('use')?.getAttributeNS('http://www.w3.org/1999/xlink','href'),status:[...document.querySelectorAll('[data-tq-clipboard-status]')].map(s=>({role:s.getAttribute('role'),live:s.getAttribute('aria-live'),atomic:s.getAttribute('aria-atomic'),hiddenClass:s.classList.contains('visually-hidden')})),probe:structuredClone(window.__tqClipboardProbe)}))
     check(`${engine}/${width}/${theme}: native code copy retains focus, icon feedback and polite status`,copied.focused&&copied.icon==='#check2'&&copied.status.length===1&&copied.status.every(s=>s.role==='status'&&s.live==='polite'&&s.atomic==='true'&&s.hiddenClass)&&copied.probe.copyEvents>=1&&copied.probe.commands[0]?.result===true&&copied.probe.commands[0]?.selected===clipboardSource.text,{route,selector:'.btn-clipboard',copied,method:'Original native execCommand is executed; record selected exact code and successful command return. External OS application paste is not tested.'})
     await page.keyboard.press('Enter')
     await page.waitForFunction(()=>window.__tqClipboardProbe.statusChanges.filter(s=>s==='Code copied to clipboard.').length>=2)
     const repeated=await copy.evaluate(el=>({focused:document.activeElement===el,probe:structuredClone(window.__tqClipboardProbe)}))
     check(`${engine}/${width}/${theme}: repeated code copy reannounces status and retains focus`,repeated.focused&&repeated.probe.commands.length===2&&repeated.probe.commands.every(c=>c.result===true&&c.selected===clipboardSource.text)&&repeated.probe.statusChanges.includes(''),{route,selector:'.btn-clipboard',repeated})
     await copy.evaluate(el=>el.closest('.bd-code-snippet').querySelector('.highlight').innerHTML='')
     await copy.focus();await page.keyboard.press('Enter')
     await page.waitForFunction(()=>document.querySelector('[data-tq-clipboard-status]')?.textContent.startsWith('Copy was not completed. Press '))
     const failedCopy=await copy.evaluate(el=>({focused:document.activeElement===el,status:document.querySelector('[data-tq-clipboard-status]').textContent,probe:structuredClone(window.__tqClipboardProbe)}))
     check(`${engine}/${width}/${theme}: actual ClipboardJS empty-code error announces fallback instructions`,failedCopy.focused&&/Press (?:Ctrl-|⌘)C to copy\./.test(failedCopy.status),{route,selector:'.btn-clipboard',failedCopy,fixture:'Temporarily empty the actual highlight source to exercise ClipboardJS own error branch, then restore it. This does not simulate clipboard permission denial.'})
     await copy.evaluate((el,html)=>el.closest('.bd-code-snippet').querySelector('.highlight').innerHTML=html,clipboardSource.html)
     report.visits.push({engine,width,theme,route})
    }
    {
     const route='/docs/5.3/utilities/overflow/'
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     for(const token of ['overflow-auto','overflow-scroll','overflow-x-auto','overflow-x-scroll','overflow-y-auto','overflow-y-scroll']){
      const selector=`.bd-example > .${token}[role="region"]`,region=page.locator(selector).first(),horizontal=token.includes('-x-')
      const named=await region.evaluate(el=>({tabindex:el.tabIndex,label:el.getAttribute('aria-label'),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}))
      check(`${engine}/${width}/${theme}/${token}: scrolling utility has a named keyboard region`,named.tabindex===0&&named.label&&(horizontal?named.scrollWidth>named.clientWidth:named.scrollHeight>named.clientHeight),{route,selector,region:named})
      const prepared=await region.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus();return document.activeElement===previous})
      if(prepared)await page.keyboard.press('Tab')
      const reached=prepared&&await region.evaluate(el=>document.activeElement===el)
      check(`${engine}/${width}/${theme}/${token}: actual Tab reaches utility scrolling region`,reached,{route,selector})
      const before=await region.evaluate((el,x)=>{if(x)el.scrollLeft=0;else el.scrollTop=0;return x?el.scrollLeft:el.scrollTop},horizontal)
      await page.keyboard.press(horizontal?'ArrowRight':'ArrowDown');await page.waitForTimeout(150)
      const after=await region.evaluate((el,x)=>x?el.scrollLeft:el.scrollTop,horizontal)
      check(`${engine}/${width}/${theme}/${token}: keyboard scrolls utility region`,after>before,{route,selector,before,after})
     }
     report.visits.push({engine,width,theme,route})
    }
    for(const name of ['cheatsheet','cheatsheet-rtl','masonry']){
     const route=`/docs/5.3/examples/${name}/`
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     const selector=name==='masonry'?'main pre[role="region"]':'.scrollspy-example.overflow-auto'
     const region=page.locator(selector).first()
     const named=await region.evaluate(el=>({tabindex:el.tabIndex,role:el.getAttribute('role'),label:el.getAttribute('aria-label'),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}))
     check(`${engine}/${width}/${theme}/${name}: intended scrolling region is named and keyboard accessible`,named.tabindex===0&&named.role==='region'&&named.label&&(name==='masonry'?named.scrollWidth>named.clientWidth:named.scrollHeight>named.clientHeight),{selector,region:named})
     await region.evaluate(el=>{const previous=[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>n.tabIndex>=0&&!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]')&&Boolean(n.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);previous?.focus()})
     await page.keyboard.press('Tab')
     const reached=await region.evaluate(el=>document.activeElement===el)
     check(`${engine}/${width}/${theme}/${name}: actual Tab reaches standalone scrolling region`,reached,{selector})
     const before=await region.evaluate((el,horizontal)=>{if(horizontal)el.scrollLeft=0;else el.scrollTop=0;return horizontal?el.scrollLeft:el.scrollTop},name==='masonry')
     await page.keyboard.press(name==='masonry'?'ArrowRight':'ArrowDown')
     await page.waitForFunction(({selector,before,horizontal})=>{const el=document.querySelector(selector);return el&&(horizontal?el.scrollLeft:el.scrollTop)>before},{selector,before,horizontal:name==='masonry'},{timeout:3000}).catch(()=>{})
     const after=await region.evaluate((el,horizontal)=>horizontal?el.scrollLeft:el.scrollTop,name==='masonry')
     check(`${engine}/${width}/${theme}/${name}: keyboard scrolls intended container`,after>before,{selector,before,after})
     report.visits.push({engine,width,theme,route})
    }
    {
     const route='/docs/5.3/components/dropdowns/'
     await visit(route);await page.evaluate(()=>document.fonts.ready)
     const selectors=['.bd-content .btn-sm.dropdown-toggle-split.btn-secondary','.bd-content .dropstart .dropdown-toggle-split.btn-secondary']
     for(const selector of selectors){
      const toggle=page.locator(selector)
      await toggle.scrollIntoViewIfNeeded()
      const target=await toggle.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),cx=r.x+r.width/2,cy=r.y+r.height/2;return {width:r.width,height:r.height,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,nativeSpacingUtility:el.classList.contains('px-3'),centerExposed:el.contains(document.elementFromPoint(cx,cy))}})
      const axe=await new AxeBuilder({page}).include(selector).withRules(['target-size']).analyze()
      check(`${engine}/${width}/${theme}: split toggle has exposed24px target with native padding`,target.nativeSpacingUtility&&target.width>=24&&target.height>=24&&target.centerExposed&&axe.violations.length===0,{selector,target,axeViolations:axe.violations})
      await toggle.click();await page.waitForFunction(selector=>document.querySelector(selector)?.getAttribute('aria-expanded')==='true',selector)
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape')
      const restored=await toggle.evaluate(el=>el.getAttribute('aria-expanded')==='false'&&document.activeElement===el)
      check(`${engine}/${width}/${theme}: padded split toggle pointer, keyboard and focus lifecycle`,restored,{selector})
     }
     report.visits.push({engine,width,theme,route})
    }
   }catch(error){check(`${engine}/${width}/${theme}: runtime completes`,false,{error:String(error),stack:error.stack})}finally{await context.close()}
  }}finally{await browser.close()}
 }
}
const sourceAtEnd={}
currentVisit={}
for(const name of Object.keys(sourceAtStart))sourceAtEnd[name]=sha(await fs.readFile(path.join(root,name)))
report.assetsFrozen=JSON.stringify(sourceAtStart)===JSON.stringify(sourceAtEnd)
check('Source inputs frozen throughout scoped checks',report.assetsFrozen,{files:Object.keys(sourceAtStart).length})
report.scriptSHA256=sourceAtStart['qa/remediation-docs.mjs']
report.assetsAtStart=sourceAtStart;report.assetsAtEnd=sourceAtEnd
report.finished=new Date().toISOString();report.summary={checks:report.checks.length,passed:report.checks.filter(x=>x.pass).length,failed:report.checks.filter(x=>!x.pass).length,visits:report.visits.length,findings:report.findings.length,sourceFiles:Object.keys(sourceAtStart).length,runtime}
await fs.mkdir(path.join(root,'qa/results'),{recursive:true})
const output=path.join(root,'qa/results',runtime?'remediation-docs.json':'remediation-docs-source.json')
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report.summary))
if(report.findings.length)process.exitCode=1
