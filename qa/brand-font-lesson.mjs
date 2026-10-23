import {chromium, firefox, webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='qa/results/brand-font/lesson';
await fs.mkdir(out,{recursive:true});
const report=process.env.TQ_LESSON_BROWSER ? JSON.parse(await fs.readFile(out+'/report.json','utf8')) : {scope:'Standalone typography lesson; automated workflow, responsive, keyboard and accessibility checks. No full WCAG conformance claim.',browsers:[],scans:[],errors:[]};
const url='http://127.0.0.1:5198/lessons/typography/';
for(const [name, engine] of Object.entries({chromium,firefox,webkit})){
 if(process.env.TQ_LESSON_BROWSER && name!==process.env.TQ_LESSON_BROWSER)continue;
 console.log('Testing '+name);
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(name+': '+e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(name+': '+r.status()+' '+r.url());});
 await page.goto(url);
 // This WebKit runner defaults to form-only Tab navigation. Exercise the
 // skip link's keyboard activation explicitly; real Safari preference testing
 // remains separate from this automated engine check.
 if(name==='webkit')await page.locator('.skip-link').focus();
 else await page.keyboard.press('Tab');
 assert.equal(await page.locator(':focus').textContent(),'Skip to lesson');
 await page.keyboard.press('Enter');
 assert.equal(await page.locator(':focus').getAttribute('id'),'main');
 await page.locator('label[for="family-serif"]').click();
 assert.match(await page.locator('#family-preview').evaluate(el=>getComputedStyle(el).fontFamily),/Georgia/);
 await page.locator('label[for="family-mono"]').click();
 assert.equal(await page.locator('#progress-label').textContent(),'1 of 4');
 await page.locator('#sample-text').fill('<b>My words</b>');
 assert.equal(await page.locator('#family-sentence').textContent(),'<b>My words</b>');
 assert.equal(await page.locator('#family-sentence b').count(),0);
 await page.locator('#check-hierarchy').click();
 assert.match(await page.locator('#hierarchy-feedback').textContent(),/Try again/);
 await page.locator('label[for="hierarchy-loud"]').click();
 await page.locator('#check-hierarchy').click();
 assert.match(await page.locator('#hierarchy-feedback').textContent(),/Try again/);
 await page.locator('label[for="hierarchy-clear"]').click();
 await page.locator('#check-hierarchy').click();
 assert.equal(await page.locator('#progress-label').textContent(),'2 of 4');
 await page.locator('#check-spacing').click();
 assert.match(await page.locator('#spacing-feedback').textContent(),/increase text size/);
 for(const [id,key,times] of [['font-size','ArrowRight',2],['line-height','ArrowRight',3],['line-width','ArrowLeft',4]]){
  await page.locator('#'+id).focus();for(let i=0;i<times;i++)await page.keyboard.press(key);
 }
 assert.equal(await page.locator('#size-value').textContent(),'18 px');
 assert.equal(await page.locator('#line-value').textContent(),'1.5×');
 assert.equal(await page.locator('#width-value').textContent(),'60 ch');
 await page.locator('#alignment').selectOption('center');
 await page.locator('#check-spacing').click();
 assert.match(await page.locator('#spacing-feedback').textContent(),/choose left alignment/);
 await page.locator('#alignment').selectOption('left');
 await page.locator('#check-spacing').click();
 assert.equal(await page.locator('#progress-label').textContent(),'3 of 4');
 await page.locator('#reset-lab').click();assert.equal(await page.locator('#font-size').inputValue(),'16');
 await page.locator('#quiz-check').click();assert.match(await page.locator('#quiz-feedback').textContent(),/Choose an answer/);
 await page.locator('[name="quiz-answer"][value="0"]').check();await page.locator('#quiz-check').click();
 assert.match(await page.locator('#quiz-feedback').textContent(),/Not quite/);
 for(const answer of [1,2,0,2]){
  await page.locator(`[name="quiz-answer"][value="${answer}"]`).check();await page.locator('#quiz-check').click();
  assert.match(await page.locator('#quiz-feedback').textContent(),/Correct/);
  await page.locator('#quiz-next').click();
 }
 assert.equal(await page.locator('#progress-label').textContent(),'4 of 4');
 assert.match(await page.locator('#completion-message').textContent(),/Lesson complete/);
 await page.getByRole('button',{name:'Leading, tracking and kerning',exact:true}).click();
 await page.locator('#term-space.show').waitFor();
 await page.locator('#quiz-restart').click();
 assert.match(await page.locator('#quiz-count').textContent(),/Question 1/);
 assert.equal(await page.locator(':focus').getAttribute('id'),'quiz-question');
 report.browsers=report.browsers.filter(b=>b.name!==name);
 report.browsers.push({name,workflow:'passed',keyboard:name==='webkit'?'Explicitly focused skip link activation, range inputs and quiz focus passed; runner defaults to form-only Tab navigation':'Tab to skip link, range inputs and quiz focus passed'});
 if(name==='chromium'){
  await page.reload();
  for(const theme of ['light','dark']){
   if(theme==='dark')await page.locator('#theme-toggle').click();
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,`overflow ${theme} ${width}`);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
    report.scans.push({theme,width,violations:axe.violations});
    console.log(theme+' '+width+': '+axe.violations.length+' violations');
    if(width===390||width===1440){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${theme}-${width}.png`,fullPage:true});}
   }
  }
  await page.locator('#theme-toggle').click();
  await page.setViewportSize({width:1280,height:900});
  await page.addStyleTag({content:'html{font-size:200%} p{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;margin-bottom:2em!important}'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'200% text resize and spacing overflow');
  report.textResize='200% base font plus text-spacing overrides: no page overflow';
  await page.emulateMedia({forcedColors:'active'});
  await page.screenshot({path:out+'/forced-colors.png'});
  const offline=await browser.newPage();
  await offline.route('https://**',route=>route.abort());
  await offline.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable');}});});
  await offline.goto('file:///'+process.cwd().replaceAll('\\','/')+'/lessons/typography/index.html');
  await offline.locator('label[for="family-serif"]').click();
  assert.match(await offline.locator('#family-name').textContent(),/Georgia/);
  report.offline='Local file opens with relative assets, remote requests blocked and storage unavailable';
  await offline.close();
 }
 await browser.close();
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
}
report.summary={workflowBrowsers:report.browsers.length,scans:report.scans.length,violations:report.scans.reduce((n,s)=>n+s.violations.length,0),errors:report.errors};
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(report.summary.violations||report.errors.length)process.exitCode=1;
