import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'qa/results/harmony-one-20261023');
const base='http://127.0.0.1:5198';
const prior=JSON.parse(await fs.readFile(path.join(output,'accessibility-scan.json')));
const routes=[...new Set([...prior.pages.filter(p=>p.violations?.length||p.error||p.finalURL?.startsWith(base)).map(p=>p.source),'/docs/5.3/components/buttons/','/docs/5.3/customize/components/'])];
const report={started:new Date().toISOString(),scope:'Final published follow-up of every full-scan finding and cross-port redirect, plus heading links and callouts; both modes, Chromium 1440x1000. Also measures custom blue button rest/hover/pressed text contrast. Automated checks are not full WCAG conformance.',routes,pages:[],states:[],errors:[]};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function files(dir){const found=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())found.push(...await files(p));else if(/\.(html|css|js)$/.test(p))found.push(p);}return found.sort();}
async function hashes(){return Object.fromEntries(await Promise.all((await files(path.join(root,'docs/5.3'))).concat(fileURLToPath(import.meta.url)).map(async p=>[path.relative(root,p).replaceAll('\\','/'),sha(await fs.readFile(p))])));}
report.inputsAtStart=await hashes();
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const queue=['light','dark'].flatMap(theme=>routes.map(route=>({route,theme})));
const browser=await chromium.launch();
await Promise.all(Array.from({length:3},async()=>{while(queue.length){
  const item=queue.shift(),context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:item.theme,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  try{
    await page.addInitScript(theme=>localStorage.setItem('theme',theme),item.theme);
    await page.goto(base+item.route,{waitUntil:'load'});
    await page.waitForTimeout(300);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
    report.pages.push({...item,url:page.url(),violations:result.violations,incomplete:result.incomplete});
    if(item.route.endsWith('/color-modes/')){
      const button=page.locator('#dropdownMenuButtonCustom');
      for(const state of ['rest','hover','pressed']){
        await button.scrollIntoViewIfNeeded();
        if(state==='hover')await button.hover();
        if(state==='pressed')await page.mouse.down();
        await page.waitForTimeout(200);
        const paint=await button.evaluate(el=>({text:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
        const contrast=ratio(rgb(paint.text),rgb(paint.background));
        report.states.push({...item,state,...paint,contrast,pass:contrast>=4.5});
      }
      await page.mouse.up();await page.keyboard.press('Escape');
    }
    if(item.route.endsWith('/buttons/')){
      const anchor=page.locator('#variants .anchor-link');await anchor.hover();
      const paint=await anchor.evaluate(el=>({text:getComputedStyle(el).color,background:getComputedStyle(document.body).backgroundColor}));
      const contrast=ratio(rgb(paint.text),rgb(paint.background));report.states.push({...item,state:'heading-anchor-hover',...paint,contrast,pass:contrast>=4.5});
    }
    console.log(item.theme+' '+item.route+': '+result.violations.length+' violations');
  }catch(error){report.errors.push({...item,error:error.stack});}
  await context.close();
}}));
await browser.close();
report.inputsAtEnd=await hashes();
report.summary={pages:report.pages.length,expectedPages:routes.length*2,violations:report.pages.reduce((n,p)=>n+p.violations.length,0),stateChecks:report.states.length,stateFailures:report.states.filter(s=>!s.pass).length,errors:report.errors.length,inputsFrozen:JSON.stringify(report.inputsAtStart)===JSON.stringify(report.inputsAtEnd)};
report.finished=new Date().toISOString();await fs.writeFile(path.join(output,'final-followup.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));
if(report.summary.violations||report.summary.stateFailures||report.summary.errors||!report.summary.inputsFrozen||report.summary.pages!==report.summary.expectedPages)process.exitCode=1;
