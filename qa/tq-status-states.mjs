import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
const out='qa/results/tq-status-colours';
await fs.mkdir(out,{recursive:true});
const report={scope:'Rendered native solid and outline button text in rest, hover, keyboard focus and pressed states; Chromium, Firefox and WebKit, light and dark. Also alert previews at 390 and 1440px. Not a full WCAG conformance audit.',checks:[],errors:[]};
for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
 const browser=await type.launch();
 for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:theme,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  await page.addInitScript(t=>localStorage.setItem('theme',t),theme);
  try{
   await page.goto('http://127.0.0.1:5198/docs/5.3/components/buttons/',{waitUntil:'load'});
   for(const kind of ['','outline-'])for(const role of ['primary','secondary','success','info','warning','danger','light','dark']){
    const button=page.locator('.bd-example .btn-'+kind+role).first();
    for(const state of ['rest','hover','focus','pressed']){
     await page.mouse.move(0,0);await button.evaluate(e=>e.blur());
     if(state==='hover'||state==='pressed')await button.hover();
     if(state==='focus')await button.focus();
     if(state==='pressed')await page.mouse.down();
     await page.waitForTimeout(170);
     const paint=await button.evaluate(el=>{
      const rgba=s=>s.match(/[\d.]+/g).map(Number);
      const blend=(a,b)=>{const alpha=a[3]??1;return a.slice(0,3).map((v,i)=>v*alpha+b[i]*(1-alpha));};
      const ancestors=[];for(let p=el;p;p=p.parentElement)ancestors.push(p);
      let bg=[255,255,255];for(const p of ancestors.reverse())bg=blend(rgba(getComputedStyle(p).backgroundColor),bg);
      return {fg:blend(rgba(getComputedStyle(el).color),bg),bg};
     });
     const lum=a=>a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
     const l=[lum(paint.fg),lum(paint.bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05);
     report.checks.push({engine,theme,kind,role,state,...paint,ratio,pass:ratio>=4.5});
     if(state==='pressed')await page.mouse.up();
    }
   }
   if(engine==='chromium'){
    await page.goto('http://127.0.0.1:5198/docs/5.3/components/alerts/',{waitUntil:'load'});
    for(const width of [390,1440]){
     await page.setViewportSize({width,height:1000});
     await page.locator('.bd-example').first().screenshot({path:path.join(out,`alerts-${theme}-${width}.png`)});
     report.checks.push({engine,theme,width,check:'alerts horizontal overflow',pass:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
    }
   }
  }catch(e){report.errors.push({engine,theme,error:e.stack});}
  await context.close();
 }
 await browser.close();console.log(engine+' complete');
}
report.summary={checks:report.checks.length,failures:report.checks.filter(c=>!c.pass),errors:report.errors};
await fs.writeFile(out+'/states.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));
if(report.summary.failures.length||report.errors.length)process.exitCode=1;
