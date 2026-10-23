import fs from 'node:fs/promises'
import { chromium, webkit } from 'playwright'
const base='http://127.0.0.1:5198', observations=[]
for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch()
 for(let repeat=0;repeat<3;repeat++){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:name==='webkit'?'reduce':'no-preference'})
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort())
  await page.addInitScript(()=>{window.__trace=[];for(const type of ['pointerenter','pointerleave','focusin','focusout','click','show.bs.popover','shown.bs.popover','hide.bs.popover','hidden.bs.popover'])document.addEventListener(type,event=>{const target=event.target;window.__trace.push({time:performance.now(),type,target:target.id||target.className,active:document.activeElement?.id,describedby:target.getAttribute?.('aria-describedby'),x:event.clientX,y:event.clientY})},{capture:true})})
  const route=name==='chromium'?'components/popovers':'examples/checkout'
  const result={browser:name,repeat,route}
  try{
   await page.goto(`${base}/docs/5.3/${route}/`,{waitUntil:'load'})
   if(name==='chromium'){
    const focus=page.locator('[data-bs-toggle="popover"][data-bs-trigger="focus"]').first();await focus.focus();await page.waitForFunction(element=>document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show'),await focus.elementHandle());await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.popover.show'));await focus.evaluate(element=>element.blur());await page.mouse.move(2,998);await page.waitForTimeout(350)
    const hover=page.locator('[data-bs-toggle="popover"][data-bs-trigger="hover focus"]').first();await hover.hover();await page.waitForFunction(element=>document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show'),await hover.elementHandle());result.id=await hover.getAttribute('aria-describedby');const popup=page.locator(`#${result.id}`);result.before=await popup.boundingBox();await popup.hover();await page.waitForTimeout(500);result.after=await hover.evaluate(element=>({id:element.getAttribute('aria-describedby'),popovers:[...document.querySelectorAll('.popover')].map(node=>({id:node.id,className:node.className})),active:document.activeElement?.id}));result.pass=await popup.count()===1&&await popup.evaluate(element=>element.classList.contains('show'))
   }else{
    const form=page.locator('form.needs-validation');await form.locator('[type="submit"]').click();const link=form.locator('[data-tq-validation-summary] a').first();result.target=await link.evaluate(element=>new URL(element.href).hash.slice(1));result.link=await link.evaluate(element=>({html:element.outerHTML,rect:element.getBoundingClientRect().toJSON(),active:document.activeElement?.id}));await link.click();await page.waitForTimeout(300);result.after=await page.evaluate(()=>({active:document.activeElement?.id,tag:document.activeElement?.tagName,scrollY}));result.pass=result.after.active===result.target
   }
  }catch(error){result.error=error.stack}
  result.trace=await page.evaluate(()=>window.__trace);observations.push(result);console.log(JSON.stringify({...result,trace:undefined}));await page.close()
 }
 await browser.close()
}
await fs.writeFile(new URL('../results/remediation/production-final-focused-diagnostic.json',import.meta.url),JSON.stringify({observations},null,2))
