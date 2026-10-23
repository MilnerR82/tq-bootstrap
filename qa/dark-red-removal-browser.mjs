import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const out='qa/results/dark-red-removal'; await fs.mkdir(out,{recursive:true});
const report={scope:'Notification contrast and neutral white foregrounds; targeted Chromium light/dark checks, not complete WCAG conformance.',pages:[],checks:[]};
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const lum=a=>a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const routes=['components/badge','utilities/position','utilities/colors','helpers/colored-links','components/dropdowns','components/navbar','content/typography','customize/components','components/alerts','components/buttons','components/list-group','forms/range','customize/color','getting-started/javascript','examples/cover','examples/sign-in'];
const jobs=['light','dark'].flatMap(theme=>routes.map(route=>({theme,route,width:1440}))).concat(['light','dark'].flatMap(theme=>['components/badge','utilities/position'].map(route=>({theme,route,width:390}))));
const browser=await chromium.launch();
await Promise.all(Array.from({length:3},async()=>{while(jobs.length){
 const info=jobs.shift();const context=await browser.newContext({viewport:{width:info.width,height:1000},colorScheme:info.theme,reducedMotion:'reduce'});const page=await context.newPage();
 await page.addInitScript(theme=>localStorage.setItem('theme',theme),info.theme);
 await page.goto('http://127.0.0.1:5198/docs/5.3/'+info.route+'/',{waitUntil:'load'});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();report.pages.push({...info,violations:axe.violations});
 if(['components/badge','utilities/position'].includes(info.route)){
  const counters=page.locator('.bd-example .btn-primary > .text-bg-light, .bd-example .btn-primary > .bg-light');
  const paints=await counters.evaluateAll(els=>els.map(el=>({text:el.textContent.trim(),background:getComputedStyle(el).backgroundColor,foreground:getComputedStyle(el).color,button:getComputedStyle(el.closest('button')).backgroundColor})));
  report.checks.push({...info,check:'expected neutral notification count',pass:paints.length===(info.route==='components/badge'?3:2)});
  for(const paint of paints){const edge=ratio(rgb(paint.background),rgb(paint.button)),text=ratio(rgb(paint.foreground),rgb(paint.background));report.checks.push({...info,check:'notification separation and text contrast',...paint,edgeContrast:edge,textContrast:text,pass:paint.background==='rgb(241, 239, 237)'&&edge>=3&&(!/\d/.test(paint.text)||text>=4.5)});}
  if(info.route==='components/badge'&&info.theme==='light'&&info.width===1440){
   const button=page.getByRole('button',{name:'Inbox 99+ unread messages',exact:true});await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();
   await page.screenshot({path:out+'/inbox.png',clip:{x:b.x-12,y:b.y-24,width:b.width+65,height:b.height+40}});
  }
 }
 if(info.theme==='dark'){
  const body=await page.evaluate(()=>getComputedStyle(document.body).color);report.checks.push({...info,check:'dark body foreground is white',actual:body,pass:body==='rgb(255, 255, 255)'});
 }
 console.log(info.theme+' '+info.route+' '+info.width+': '+axe.violations.length+' violations');await context.close();
}}));
await browser.close();report.summary={pages:report.pages.length,violations:report.pages.reduce((n,p)=>n+p.violations.length,0),checks:report.checks.length,failures:report.checks.filter(c=>!c.pass)};await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));if(report.summary.violations||report.summary.failures.length)process.exitCode=1;
