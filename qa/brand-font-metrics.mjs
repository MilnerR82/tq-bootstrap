import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const phase=process.argv[2]||'after',out='qa/results/brand-font';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
for(const width of [390,1440])for(const route of ['docs/5.3/content/typography/','docs/5.3/components/buttons/','docs/5.3/forms/form-control/','lessons/typography/']){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5198/'+route);
 const metrics=await page.evaluate(()=>{
  const data={};
  for(const selector of ['body','h1','h2','h3','.lead','.btn','.form-control']){
   const el=document.querySelector(selector);if(!el)continue;const s=getComputedStyle(el);
   data[selector]={fontFamily:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing};
  }
  return {data,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 const session=await page.context().newCDPSession(page);
 await session.send('DOM.enable');await session.send('CSS.enable');
 const {root}=await session.send('DOM.getDocument');
 const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'h1'});
 const fonts=await session.send('CSS.getPlatformFontsForNode',{nodeId});
 results.push({route,width,...metrics,renderedHeadingFonts:fonts.fonts.map(f=>({family:f.familyName,custom:f.isCustomFont}))});
 if(phase==='after'&&route==='lessons/typography/'&&width===1440)await page.screenshot({path:out+'/preview.png'});
 await page.close();
}
await browser.close();
if(phase==='after'){
 const before=JSON.parse(await fs.readFile(out+'/before.json','utf8'));
 for(let i=0;i<results.length;i++){
  const a=before[i],b=results[i];assert.equal(b.overflow,false,`${b.route} ${b.width} overflow`);
  assert.match(b.data.body.fontFamily,/^"Helvetica Neue", Arial, sans-serif/);
  for(const key of Object.keys(a.data))for(const property of ['fontSize','lineHeight','fontWeight','letterSpacing'])assert.equal(b.data[key][property],a.data[key][property],`${b.route} ${b.width} ${key} ${property}`);
 }
}
await fs.writeFile(`${out}/${phase}.json`,JSON.stringify(results,null,2));
console.log(`${phase}: ${results.length} route/viewport samples${phase==='after'?'; sizes, line heights, weights and letter spacing unchanged':''}`);
