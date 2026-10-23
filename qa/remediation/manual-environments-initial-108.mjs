import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium,firefox,webkit} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198',origin=new URL(base).origin,sha=b=>createHash('sha256').update(b).digest('hex');
const routes=['/','/docs/5.3/components/buttons/','/docs/5.3/forms/form-control/','/docs/5.3/forms/validation/','/docs/5.3/examples/checkout/','/docs/5.3/examples/navbar-bottom/'];
const settings=[{name:'320px text spacing',width:320,textSpacing:true},{name:'200% text size',width:1280,textScale:true},{name:'forced colours',width:390,forced:true}];
const report={suite:'Targeted reflow, text resizing, text spacing, forced colours and keyboard focus',started:new Date().toISOString(),routes,settings,checks:[],visits:[],findings:[],screenshots:[],limits:['These are targeted scripted environment checks, with saved screenshots for visual review; they do not substitute for NVDA or Safari/VoiceOver.','200% text sizing changes the root font size, not browser page zoom; separate real-browser zoom evidence records the actual Chromium zoom value and viewport.','Scrollable code/tables and intentionally clipped utility demonstrations need their separately recorded context review. A body-width discrepancy alone is not treated as a confirmed loss of content.']};
const add=(info,name,pass,detail={})=>{const row={...info,name,pass,...detail};report.checks.push(row);if(!pass)report.findings.push(row)};
async function files(dir){const a=[];for(const e of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const n=dir+'/'+e.name;if(e.isDirectory())a.push(...await files(n));else a.push(n)}return a}
async function fingerprint(){const names=[...routes.map(r=>r==='/'?'index.html':r.slice(1)+'index.html'),'qa/remediation/manual-environments.mjs',...await files('docs/5.3/dist'),...(await files('docs/5.3/assets')).filter(n=>/\.(css|js)$/.test(n))];return Object.fromEntries(await Promise.all(names.sort().map(async n=>[n,sha(await fs.readFile(path.join(root,n)))])))}
report.assetsAtStart=await fingerprint();
await fs.mkdir(path.join(root,'qa/results/remediation/screenshots'),{recursive:true});
for(const [engine,type]of Object.entries({chromium,firefox,webkit})){
 const browser=await type.launch();
 for(const theme of ['light','dark'])for(const setting of settings)for(const route of routes){
  const info={engine,theme,setting:setting.name,route,width:setting.width};
  const context=await browser.newContext({viewport:{width:setting.width,height:900},colorScheme:theme,reducedMotion:'reduce',forcedColors:setting.forced?'active':'none'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin||r.request().url().startsWith('data:')?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(value=>{try{localStorage.setItem('theme',value)}catch{}},theme);
   await page.goto(base+route,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const before=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
   if(setting.textSpacing)await page.addStyleTag({content:'body * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }'});
   if(setting.textScale)await page.addStyleTag({content:`html { font-size:${before*2}px !important; }`});
   await page.screenshot();
   const layout=await page.evaluate(()=>({viewport:innerWidth,bodyWidth:document.body.scrollWidth,rootWidth:document.documentElement.scrollWidth,fontSize:parseFloat(getComputedStyle(document.documentElement).fontSize),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,forced:matchMedia('(forced-colors: active)').matches,spacing:(()=>{const p=document.querySelector('main p,main label,h1');if(!p)return null;const s=getComputedStyle(p);return{fontSize:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),letterSpacing:parseFloat(s.letterSpacing),wordSpacing:parseFloat(s.wordSpacing)}})()}));
   const palette=setting.forced?await page.evaluate(()=>{const probe=document.createElement('span'),system=document.createElement('span');probe.style.cssText='position:fixed;left:-10000px;color:rgb(1,2,3);background-color:rgb(4,5,6);forced-color-adjust:auto';system.style.cssText='position:fixed;left:-10000px;color:CanvasText;background-color:Canvas';document.body.append(probe,system);const p=getComputedStyle(probe),s=getComputedStyle(system),result={authoredText:p.color,authoredBackground:p.backgroundColor,systemText:s.color,systemBackground:s.backgroundColor,automaticPalette:p.color===s.color&&p.backgroundColor===s.backgroundColor};probe.remove();system.remove();return result}):null;
   const environmentSupported=!setting.forced||(layout.forced&&palette.automaticPalette);
   add(info,'Requested theme and reduced-motion preferences apply',await page.locator('html').getAttribute('data-bs-theme')===theme&&layout.reducedMotion,{layout});
   if(setting.textScale)add(info,'Text actually doubles',Math.abs(layout.fontSize-before*2)<.01,{before,after:layout.fontSize});
   if(setting.textSpacing)add(info,'Requested text spacing actually applies',layout.spacing&&Math.abs(layout.spacing.lineHeight/layout.spacing.fontSize-1.5)<.05&&Math.abs(layout.spacing.letterSpacing/layout.spacing.fontSize-.12)<.01&&Math.abs(layout.spacing.wordSpacing/layout.spacing.fontSize-.16)<.01,{spacing:layout.spacing});
   const selectors=setting.forced?['main .btn','main .form-control','main .form-select','main .form-check-input','main .form-range','.navbar-toggler']:['main .btn,main button,main input,main select,main a[href],.navbar-toggler'];
   for(const selector of environmentSupported?selectors:[]){const target=page.locator(selector).filter({visible:true}).first();if(!await target.count()||!await target.isEnabled())continue;
    await target.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await page.screenshot();
    const focus=await target.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),visible=el.matches(':focus-visible');const hit=document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),Math.max(0,Math.min(innerHeight-1,r.y+r.height/2)));return{focused:document.activeElement===el,visible,unobscured:hit===el||el.contains(hit),outlineWidth:parseFloat(s.outlineWidth),outlineStyle:s.outlineStyle,boxShadow:s.boxShadow,rect:{x:r.x,y:r.y,width:r.width,height:r.height},view:{width:innerWidth,height:innerHeight}}});
    add(info,'Keyboard reaches control with visible focus',focus.focused&&focus.visible&&focus.unobscured&&((focus.outlineWidth>0&&focus.outlineStyle!=='none')||focus.boxShadow!=='none'),{selector,focus});
   }
   add(info,'No page errors',errors.length===0,{errors});
   if(engine==='chromium'&&theme==='light'&&['/docs/5.3/forms/form-control/','/docs/5.3/examples/checkout/'].includes(route)){const file='qa/results/remediation/screenshots/environment-'+setting.name.replace(/[^a-z0-9]+/gi,'-')+'-'+(route.includes('checkout')?'checkout':'forms')+'.png';await page.screenshot({path:path.join(root,file)});report.screenshots.push(file)}
   report.visits.push({...info,layout,palette,environmentSupported,status:environmentSupported?'requested environment exercised':'full automatic forced-colours palette unsupported; control checks not counted'});
  }catch(e){add(info,'Environment visit completes',false,{error:e.message})}finally{await context.close()}
 }
 await browser.close();
}
report.assetsAtEnd=await fingerprint();report.finished=new Date().toISOString();report.summary={visits:report.visits.length,expectedVisits:108,unsupportedForcedVisits:report.visits.filter(v=>!v.environmentSupported).length,actualForcedVisits:report.visits.filter(v=>v.setting==='forced colours'&&v.environmentSupported).length,checks:report.checks.length,passed:report.checks.filter(e=>e.pass).length,failed:report.findings.length,assetsFrozen:JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd)};
await fs.writeFile(path.join(root,'qa/results/remediation/manual-environments.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.summary.failed||!report.summary.assetsFrozen||report.visits.length!==108)process.exitCode=1;
