import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseDocument,DomUtils} from 'htmlparser2';
import {chromium,firefox,webkit} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198',origin=new URL(base).origin;
const baselinePath=path.join(root,'qa/results/pre-remediation-20261022/version-scope.json');
const output=path.join(root,'qa/results/version-scope.json');
const sha=body=>createHash('sha256').update(body).digest('hex');
const classes=node=>(node.attribs?.class||'').split(/\s+/);
async function files(directory){const found=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())found.push(...await files(file));else found.push(file);}return found.sort();}
function inspect(html){
 const document=parseDocument(html,{withStartIndices:true,withEndIndices:true});
 const node=DomUtils.findAll(el=>el.name==='li'&&classes(el).includes('nav-item')&&classes(el).includes('dropdown'),document.children).find(el=>{const button=el.children.find(child=>child.name==='button');return button&&/Bootstrap[\s\u00a0]*v5\.3/.test(DomUtils.textContent(button));});
 if(!node)return null;
 const button=node.children.find(child=>child.name==='button'),menu=node.children.find(child=>child.name==='ul');
 const anchors=DomUtils.findAll(el=>el.name==='a',menu.children);
 return{node,button,menu,anchors,html:html.slice(node.startIndex,node.endIndex+1)};
}
if(process.argv.includes('--capture-before')){
 const records=[];
 for(const file of (await files(path.join(root,'docs-source/site/dist'))).filter(file=>file.endsWith('.html'))){
  const relative=path.relative(path.join(root,'docs-source/site/dist'),file).replaceAll('\\','/');
  const body=await fs.readFile(path.join(root,relative),'utf8'),scope=inspect(body);
  if(scope){if(scope.anchors.length<2)throw Error('Capture must precede the version restriction');records.push({file:relative,beforeSHA256:sha(body),beforeNode:scope.html});}
 }
 await fs.writeFile(baselinePath,JSON.stringify({captured:new Date().toISOString(),records},null,2)+'\n');
 console.log(JSON.stringify({capturedVersionMenus:records.length}));process.exit(0);
}
const report={suite:'Bootstrap 5.3-only native version menu after accessibility remediation',started:new Date().toISOString(),files:[],checks:[],findings:[],assetsAtStart:{},assetsAtEnd:{},limits:['The version choice restriction is an explicit user-requested header change. Current whole-page hashes are fresh observations; old whole-page measurements remain historical.','Exact button/link/heading/menu structure is compared with the original native version subtree. Other authorized accessibility changes have their own exact source evidence.']};
const baseline=JSON.parse(await fs.readFile(baselinePath,'utf8'));
function add(name,pass,details={}){const row={name,pass,...details};report.checks.push(row);if(!pass)report.findings.push(row);}
for(const record of baseline.files){
 const current=await fs.readFile(path.join(root,record.file),'utf8'),scope=inspect(current),before=inspect(record.beforeNode);
 if(!scope){add('Native version menu remains present',false,{file:record.file});continue;}
 const reconstructed=current.slice(0,scope.node.startIndex)+record.beforeNode+current.slice(scope.node.endIndex+1);
 const buttonPass=DomUtils.getOuterHTML(scope.button)===DomUtils.getOuterHTML(before.button).replace('(switch to other versions)','(current version)');
 const currentLink=scope.anchors[0],originalLink=before.anchors[0];
 const linkPass=scope.anchors.length===1&&DomUtils.getOuterHTML(currentLink)===DomUtils.getOuterHTML(originalLink).replace('Latest (5.3.x)\n','v5.3 ');
 const headings=DomUtils.findAll(el=>el.name==='h6',scope.menu.children);
 const headingPass=headings.length===1&&DomUtils.textContent(headings[0])==='v5.3'&&JSON.stringify(headings[0].attribs)===JSON.stringify(DomUtils.findOne(el=>el.name==='h6',before.menu.children).attribs);
 const structurePass=JSON.stringify(scope.node.attribs)===JSON.stringify(before.node.attribs)&&JSON.stringify(scope.menu.attribs)===JSON.stringify(before.menu.attribs)&&scope.node.children.filter(el=>el.type==='tag').length===2&&scope.menu.children.filter(el=>el.type==='tag').length===2;
 const versionNodePreserved=buttonPass&&linkPass&&headingPass&&structurePass;
 const entry={...record,afterSHA256:sha(current),versionNodePreserved,buttonPass,linkPass,headingPass,structurePass,pass:versionNodePreserved};
 report.files.push(entry);add('Reviewed native version-menu subtree is preserved',entry.pass,{file:record.file});report.assetsAtStart[record.file]=entry.afterSHA256;
}
for(const directory of ['docs/5.3/assets','docs/5.3/dist'])for(const file of await files(path.join(root,directory)))if(/\.(?:css|js)$/.test(file))report.assetsAtStart[path.relative(root,file).replaceAll('\\','/')]=sha(await fs.readFile(file));
report.assetsAtStart['qa/version-scope.mjs']=sha(await fs.readFile(fileURLToPath(import.meta.url)));
const cases=['/','/docs/5.3/examples/','/docs/5.3/getting-started/accessibility/','/docs/5.3/components/buttons/'];
for(const [browserName,type]of Object.entries({chromium,firefox,webkit})){
 const browser=await type.launch();
 for(const width of [390,1440])for(const route of cases){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',request=>new URL(request.request().url()).origin===origin?request.continue():request.abort());
  try{
   await page.goto(base+route,{waitUntil:'load'});await page.waitForFunction(()=>Boolean(window.bootstrap?.Dropdown));
   if(width===390){await page.evaluate(()=>{window.__versionParentShown=new Promise(resolve=>document.querySelector('#bdNavbar').addEventListener('shown.bs.offcanvas',resolve,{once:true}));});await page.locator('[data-bs-toggle="offcanvas"][data-bs-target="#bdNavbar"]').click();await page.evaluate(()=>window.__versionParentShown);}
   const button=page.getByRole('button',{name:/Bootstrap\s+v5\.3\s*\(current version\)/});
   await button.click();const menu=button.locator('..').locator('.dropdown-menu');await menu.waitFor({state:'visible'});
   const values=await menu.locator('a').evaluateAll(elements=>elements.map(el=>({text:el.textContent.trim(),href:el.getAttribute('href'),current:el.getAttribute('aria-current')})));
   add('Menu offers only local Bootstrap 5.3',values.length===1&&values[0].text==='v5.3'&&values[0].current==='true'&&new URL(values[0].href,base).origin===origin,{browser:browserName,width,route,values});
   await button.press('ArrowDown');const focused=await page.evaluate(()=>document.activeElement?.textContent.trim());await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
   add('Native version dropdown keyboard and focus return',focused==='v5.3'&&await button.evaluate(el=>document.activeElement===el),{browser:browserName,width,route,focused});
   add('Version menu has no page errors',errors.length===0,{browser:browserName,width,route,errors});
  }catch(error){add('Version menu runtime',false,{browser:browserName,width,route,error:error.message});}
  await page.close();
 }
 await browser.close();
}
for(const file of Object.keys(report.assetsAtStart))report.assetsAtEnd[file]=sha(await fs.readFile(path.join(root,file)));
report.finished=new Date().toISOString();report.summary={menus:report.files.length,runtimeVisits:24,checks:report.checks.length,passed:report.checks.filter(row=>row.pass).length,failed:report.findings.length,assetsFrozen:JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd)};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));if(report.findings.length||!report.summary.assetsFrozen)process.exitCode=1;
