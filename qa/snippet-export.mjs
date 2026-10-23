import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {chromium,firefox,webkit} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath='site/src/assets/stackblitz.js';
const sourceSubstitutions=[
  {
    "from": "import snippetsContent from './partials/snippets.js?raw'\n\n",
    "to": "import snippetsContent from './partials/snippets.js?raw'\nimport bootstrapCss from '../../../../dist/css/bootstrap.min.css?raw'\nimport bootstrapRtlCss from '../../../../dist/css/bootstrap.rtl.min.css?raw'\nimport bootstrapCssMap from '../../../../dist/css/bootstrap.min.css.map?raw'\nimport bootstrapRtlCssMap from '../../../../dist/css/bootstrap.rtl.min.css.map?raw'\nimport bootstrapBundle from '../../../../dist/js/bootstrap.bundle.min.js?raw'\nimport bootstrapBundleMap from '../../../../dist/js/bootstrap.bundle.min.js.map?raw'\nimport docsCss from '../scss/docs.scss?inline'\nimport tqDocsCss from '../scss/_tq-docs.scss?inline'\n\nconst svgAssets = import.meta.glob('../../static/docs/**/assets/**/*.svg', {\n  eager: true,\n  query: '?raw',\n  import: 'default'\n})\n\n",
    "count": 1
  },
  {
    "from": "  cssCdn: '__CSS_CDN__',\n  jsBundleCdn: '__JS_BUNDLE_CDN__',",
    "to": "  cssCdn: 'bootstrap.min.css',\n  jsBundleCdn: 'bootstrap.bundle.min.js',",
    "count": 1
  },
  {
    "from": "const openBootstrapSnippet = (htmlSnippet, jsSnippet, classes) => {\n",
    "to": "const openBootstrapSnippet = (htmlSnippet, jsSnippet, classes) => {\n  const direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'\n  const theme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'\n  const language = document.documentElement.lang || 'en'\n  const cssFile = direction === 'rtl' ? 'bootstrap.rtl.min.css' : CONFIG.cssCdn\n  const assetFiles = {}\n  let exportedSnippet = htmlSnippet\n\n  for (const [source, content] of Object.entries(svgAssets)) {\n    const assetPath = source.split('/assets/').pop()\n    const originalPath = `/docs/${CONFIG.docsVersion}/assets/${assetPath}`\n    if (exportedSnippet.includes(originalPath)) {\n      const localPath = `assets/${assetPath}`\n      exportedSnippet = exportedSnippet.split(originalPath).join(localPath)\n      assetFiles[localPath] = content\n    }\n  }\n\n",
    "count": 1
  },
  {
    "from": "<html lang=\"en\">",
    "to": "<html lang=\"${language}\" dir=\"${direction}\" data-bs-theme=\"${theme}\">",
    "count": 1
  },
  {
    "from": "    <link href=\"${CONFIG.cssCdn}\" rel=\"stylesheet\">\n    <link href=\"https://getbootstrap.com/docs/${CONFIG.docsVersion}/assets/css/docs.css\" rel=\"stylesheet\">",
    "to": "    <link href=\"${cssFile}\" rel=\"stylesheet\">\n    <link href=\"docs.css\" rel=\"stylesheet\">",
    "count": 1
  },
  {
    "from": "${htmlSnippet.trimStart().replace(/^/gm, '    ').replace(/^ {4}$/gm, '').trimEnd()}",
    "to": "${exportedSnippet.trimStart().replace(/^/gm, '    ').replace(/^ {4}$/gm, '').trimEnd()}",
    "count": 1
  },
  {
    "from": "      'index.html': indexHtml,\n",
    "to": "      'index.html': indexHtml,\n      [cssFile]: direction === 'rtl' ? bootstrapRtlCss : bootstrapCss,\n      [`${cssFile}.map`]: direction === 'rtl' ? bootstrapRtlCssMap : bootstrapCssMap,\n      [CONFIG.jsBundleCdn]: bootstrapBundle,\n      [`${CONFIG.jsBundleCdn}.map`]: bootstrapBundleMap,\n      'docs.css': `${docsCss}\\n${tqDocsCss}`,\n      ...assetFiles,\n",
    "count": 1
  },
  {
    "from": "import bootstrapBundleMap from '../../../../dist/js/bootstrap.bundle.min.js.map?raw'\n",
    "to": "import bootstrapBundleMap from '../../../../dist/js/bootstrap.bundle.min.js.map?raw'\nimport accessibilityCompanion from '../../../../dist/tq/tq-accessibility.min.js?raw'\nimport accessibilityCompanionMap from '../../../../dist/tq/tq-accessibility.min.js.map?raw'\n",
    "count": 1
  },
  {
    "from": "    <script defer src=\"${CONFIG.jsBundleCdn}\"></script>\n",
    "to": "    <script defer src=\"${CONFIG.jsBundleCdn}\"></script>\n    <script defer src=\"tq-accessibility.min.js\"></script>\n    <script defer src=\"tq-init.js\"></script>\n",
    "count": 1
  },
  {
    "from": "      [`${CONFIG.jsBundleCdn}.map`]: bootstrapBundleMap,\n",
    "to": "      [`${CONFIG.jsBundleCdn}.map`]: bootstrapBundleMap,\n      'tq-accessibility.min.js': accessibilityCompanion,\n      'tq-accessibility.min.js.map': accessibilityCompanionMap,\n      'tq-init.js': 'window.TQAccessibility.init()',\n",
    "count": 1
  }
];
const sha=value=>createHash('sha256').update(value).digest('hex');
const original=await fs.readFile(path.join(root,'upstream/bootstrap-source',sourcePath),'utf8');
const actual=await fs.readFile(path.join(root,'docs-source',sourcePath),'utf8');
let reconstructed=original,legacyReconstructed;
for(const [index,change]of sourceSubstitutions.entries()){if(reconstructed.split(change.from).length-1!==change.count)throw Error('Snippet export source boundary count '+index);reconstructed=reconstructed.split(change.from).join(change.to);if(index===6)legacyReconstructed=reconstructed;}
if(reconstructed!==actual)throw Error('Unreviewed snippet export source difference');
const report={suite:'Self-contained TQ Bootstrap snippet export',started:new Date().toISOString(),sourceException:{path:sourcePath,originalSHA256:sha(original),actualSHA256:sha(actual),reconstructedSHA256:sha(reconstructed),pass:true,scope:'The original seven exact export-only resource/environment substitutions, followed by three explicit accessibility-companion resource/initialization additions. Original SDK click handler, snippet initialization transform, template selection, metadata and SDK invocation remain unchanged.',legacySevenSubstitutionSHA256:sha(legacyReconstructed),substitutions:sourceSubstitutions},checks:[],findings:[],runtimeStatus:'pending final published build'};
const output=path.join(root,process.env.TQ_SNIPPET_REPORT||'qa/results/snippet-export.json');
if(process.argv.includes('--source-only')){
  const previous=JSON.parse(await fs.readFile(output,'utf8').catch(()=>'null'));
  if(previous?.runtimeStatus!=='complete')await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({sourceProof:true,boundaries:sourceSubstitutions.length,sourceSHA256:sha(actual),runtimeReportPreserved:previous?.runtimeStatus==='complete'},null,2));
  process.exit(0);
}
const base=process.env.TQ_BASE_URL||'http://127.0.0.1:5198';
const origin=new URL(base).origin;
const cases=[
  {id:'dropdown',page:'components/dropdowns',probe:'[data-bs-toggle="dropdown"]'},
  {id:'modal',page:'components/modal',probe:'[data-bs-target="#exampleModal"][data-bs-whatever]'},
  {id:'tooltip',page:'components/tooltips',probe:'button[data-bs-toggle="tooltip"]'},
  {id:'popover',page:'components/popovers',probe:'[data-bs-toggle="popover"]'},
  {id:'live-alert',page:'components/alerts',probe:'#liveAlertBtn'},
  {id:'local-svg',page:'components/navbar',probe:'img[src="/docs/5.3/assets/brand/bootstrap-logo.svg"]'},
  {id:'css-grid',page:'layout/css-grid',probe:'.grid'}
  ,...(process.env.TQ_SNIPPET_EXTRA==='1'?[
    {id:'carousel-remediation',page:'components/carousel',probe:'#carouselExampleSlidesOnly'},
    {id:'validation-remediation',page:'forms/validation',probe:'#validationCustomUsername'},
    {id:'validation-tooltip-remediation',page:'forms/validation',probe:'#validationTooltipUsername'}
  ]:[])
].filter(item=>!process.env.TQ_SNIPPET_CASES||process.env.TQ_SNIPPET_CASES.split(',').includes(item.id));
const modes=[{theme:'light',direction:'ltr'},{theme:'dark',direction:'ltr'},{theme:'dark',direction:'rtl'}];
const selected=(process.env.TQ_SNIPPET_BROWSERS||'chromium,firefox,webkit').split(',');
report.method='Capture the real served .btn-edit click through the installed SDK form-submit boundary; prevent the actual external submission. Reconstruct and serve the exact captured files from an isolated local origin. For the documented javascript template only, a test adapter injects its index.js entrypoint after the native deferred Bootstrap script; the Bootstrap response is deliberately delayed to exercise defer ordering. No product initialisers or replacement Bootstrap scripts are injected. Verify native dropdown, modal, tooltip, popover, live-alert, SVG asset and CSS Grid snippets in light/dark and RTL environments.';
report.references=[
  {url:'https://developer.stackblitz.com/platform/api/javascript-sdk-options',use:'ProjectFiles accepts plain text/SVG; html and javascript template requirements'},
  {url:'https://developer.stackblitz.com/guides/integration/create-with-sdk',use:'The javascript template runs its index.js entrypoint; actual remote project creation is not performed'}
];
report.priorDiagnostics=[];
for(const [filename,classification]of [
  ['snippet-export-selector-diagnostic.json','The live modal anatomy example has no native export button; the harness now selects the editable varying-content modal.'],
  ['snippet-export-modal-transition-diagnostic.json','Escape was sent before the native shown event and was correctly ignored during the fade transition; the harness now waits for shown/hidden events and checks native focus management.']
]){try{const contents=await fs.readFile(path.join(root,'.cache/examples-functionality-20261022',filename),'utf8'),diagnostic=JSON.parse(contents);report.priorDiagnostics.push({filename,sha256:sha(contents),classification,summary:diagnostic.summary,findings:diagnostic.findings});}catch(error){if(error.code!=='ENOENT')throw error;}}
report.limitations=['Actual StackBlitz hosting, upload acceptance, quotas, authentication and its remote compiler are not exercised; no project is submitted. Public SDK documentation and installed SDK source expose no numeric project-payload limit. Exact measured payload byte counts are recorded rather than claiming remote acceptance.','The isolated javascript-template adapter explicitly supplies the documented index.js entrypoint and defer ordering; it does not claim to reproduce the entire remote StackBlitz compiler.','Native external content links/iframes remain external when present. The focused samples contain local resources only; current native snippet image dependencies are SVG or inline data images.','Framework and source-map files are embedded unchanged; the copied SVGs retain original artwork.'];
report.projects=[];
report.externalSubmissionAttempts=0;
function check(info,target,pass,details={}){const item={...info,target,pass,...details};report.checks.push(item);if(!pass)report.findings.push(item);}
async function walk(relative){const all=[];for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){const name=path.posix.join(relative,entry.name);if(entry.isDirectory())all.push(...await walk(name));else all.push(name);}return all;}
async function fingerprints(){
  const files=[sourcePath,...cases.map(item=>'docs/5.3/'+item.page+'/index.html'),'qa/snippet-export.mjs','docs-source/site/src/assets/partials/snippets.js','src/js/tq-accessibility.js',...await walk('dist/css'),...await walk('dist/js'),...await walk('dist/tq'),...await walk('docs/5.3/assets')];
  return Object.fromEntries(await Promise.all([...new Set(files)].sort().map(async relative=>{const filename=relative===sourcePath?'docs-source/'+relative:relative;return[filename,sha(await fs.readFile(path.join(root,filename)))];})));
}
report.assetsAtStart=await fingerprints();
const projectFiles=new Map();
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const match=url.pathname.match(/^\/project\/([^/]+)\/(.*)$/);
    const item=match&&projectFiles.get(match[1]);
    const file=match&&decodeURIComponent(match[2]||'index.html');
    if(!item||!Object.hasOwn(item.files,file)){res.writeHead(404);res.end('Missing captured project file');return;}
    let contents=item.files[file];
    if(file==='index.html'&&item.template==='javascript')contents=contents.replace('</head>','    <script defer src="index.js"></script>\n  </head>');
    if(file==='bootstrap.bundle.min.js')await new Promise(resolve=>setTimeout(resolve,100));
    const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.map')?'application/json':'text/html';
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(contents);
  }catch(error){res.writeHead(500);res.end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const isolatedOrigin='http://127.0.0.1:'+server.address().port;
const expectedJs=await fs.readFile(path.join(root,'dist/js/bootstrap.bundle.min.js'),'utf8');
const expectedCompanion=await fs.readFile(path.join(root,'dist/tq/tq-accessibility.min.js'),'utf8');
const expectedCompanionMap=await fs.readFile(path.join(root,'dist/tq/tq-accessibility.min.js.map'),'utf8');
const nativeSnippets=await fs.readFile(path.join(root,'docs-source/site/src/assets/partials/snippets.js'),'utf8');
const expectedEntry=`(() => {\n  ${nativeSnippets.replace('export default () => {','const snippets_default = () => {')}\n\n  // <stdin>\n  snippets_default();\n})();`;
try{
  for(const browserName of selected){
    const browser=await{chromium,firefox,webkit}[browserName].launch({headless:true});
    try{
      for(const mode of modes)for(const example of cases){
        const info={browser:browserName,example:example.id,sourcePageRoute:'/docs/5.3/'+example.page+'/',sourceProbe:'.bd-example '+example.probe,sourceExportControl:'.bd-code-snippet .btn-edit',...mode};
        const capture=await browser.newPage({viewport:{width:1440,height:1000}});
        let sandbox;
        try{
          capture.setDefaultTimeout(10000);
          await capture.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
          await capture.addInitScript(()=>{
            window.__snippetCaptures=[];
            const originalSubmit=HTMLFormElement.prototype.submit;
            HTMLFormElement.prototype.submit=function(){
              if(new URL(this.action,location.href).origin==='https://stackblitz.com'){
                window.__snippetCaptures.push({action:this.action,entries:Array.from(new FormData(this).entries())});return;
              }
              return originalSubmit.apply(this,arguments);
            };
          });
          await capture.goto(base+'/docs/5.3/'+example.page+'/',{waitUntil:'load'});
          await capture.evaluate(mode=>{document.documentElement.dataset.bsTheme=mode.theme;document.documentElement.dir=mode.direction;},mode);
          const snippet=capture.locator('.bd-code-snippet').filter({has:capture.locator('.bd-example '+example.probe)}).first();
          info.sourceSnippetIndex=await snippet.evaluate(element=>[...document.querySelectorAll('.bd-code-snippet')].indexOf(element));
          if(example.id.includes('validation-'))await snippet.locator('form [type="submit"]').click();
          const markup=await snippet.locator('.bd-example').first().innerHTML();
          const optIn=await snippet.locator('.btn-edit').first().getAttribute('data-sb-js-snippet');
          await snippet.locator('.btn-edit').first().click();
          await capture.waitForFunction(()=>window.__snippetCaptures.length===1);
          const posted=await capture.evaluate(()=>window.__snippetCaptures[0]);
          const fields=Object.fromEntries(posted.entries),files={};
          for(const[key,value]of posted.entries){const name=key.match(/^project\[files\]\[(.*)\]$/);if(name)files[decodeURIComponent(name[1])]=value;}
          const template=fields['project[template]'];
          check(info,'real SDK click captured exactly once',posted.action.startsWith('https://stackblitz.com/run'),{action:posted.action});
          check(info,'native template and optional entrypoint preserved',template===(optIn?'javascript':'html')&&Boolean(files['index.js'])===Boolean(optIn));
          check(info,'original Bootstrap bundle embedded byte-identically',files['bootstrap.bundle.min.js']===expectedJs);
          check(info,'accessibility companion embedded byte-identically',files['tq-accessibility.min.js']===expectedCompanion);
          check(info,'accessibility companion source map embedded byte-identically',files['tq-accessibility.min.js.map']===expectedCompanionMap);
          check(info,'independent companion initializer is supplied',files['tq-init.js']==='window.TQAccessibility.init()');
          const cssFile=mode.direction==='rtl'?'bootstrap.rtl.min.css':'bootstrap.min.css';
          check(info,'matching TQ CSS embedded byte-identically',files[cssFile]===await fs.readFile(path.join(root,'dist/css',cssFile),'utf8'));
          for(const file of [cssFile+'.map','bootstrap.bundle.min.js.map'])check(info,'original source map embedded '+file,files[file]===await fs.readFile(path.join(root,'dist',file.endsWith('.css.map')?'css':'js',file),'utf8'));
          if(optIn)check(info,'original optional snippet initialisation preserved',files['index.js']===expectedEntry);
          check(info,'no parent-origin or external stylesheet/script dependencies',!files['index.html'].includes(origin)&&!/<(?:script|link)\b[^>]*(?:src|href)=["'](?:https?:|\/\/|\/docs\/)/i.test(files['index.html']));
          const expectedMarkup=markup.replaceAll('/docs/5.3/assets/brand/','assets/brand/').trim();
          const observedMarkup=files['index.html'].split('<!-- Example Code Start-->')[1]?.split('<!-- Example Code End -->')[0]?.replace(/^ {4}/gm,'').trim();
          check(info,'native markup unchanged except local SVG paths',observedMarkup===expectedMarkup);
          const key=[browserName,mode.theme,mode.direction,example.id].join('-');
          const item={files,template};projectFiles.set(key,item);
          const requests=[],foreign=[],errors=[],badResponses=[];
          sandbox=await browser.newPage({viewport:{width:1440,height:1000}});
          sandbox.setDefaultTimeout(6000);
          await sandbox.route('**/*',route=>{const url=route.request().url();requests.push(url);if(new URL(url).origin!==isolatedOrigin){foreign.push(url);return route.abort();}return route.continue();});
          sandbox.on('pageerror',error=>errors.push(error.message));
          sandbox.on('response',response=>{if(response.status()>=400)badResponses.push({url:response.url(),status:response.status()});});
          await sandbox.goto(isolatedOrigin+'/project/'+key+'/index.html',{waitUntil:'load'});
          await sandbox.waitForFunction(()=>Boolean(window.bootstrap?.Modal));
          await sandbox.waitForFunction(()=>Boolean(window.TQAccessibility?.init));
          check(info,'theme, direction and TQ primary paint preserved',await sandbox.evaluate(mode=>document.documentElement.dataset.bsTheme===mode.theme&&document.documentElement.dir===mode.direction&&getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim()==='#e31b23',mode));
          if(example.id==='dropdown'){
            const trigger=sandbox.locator('[data-bs-toggle="dropdown"]').first();await trigger.click();await sandbox.locator('.dropdown-menu.show').first().waitFor({state:'visible'});await trigger.press('Escape');await sandbox.locator('.dropdown-menu.show').waitFor({state:'hidden'});check(info,'native dropdown opens and Escape closes',true);
          }else if(example.id==='modal'){
            await sandbox.evaluate(()=>{window.__snippetModalEvents=[];for(const type of ['shown.bs.modal','hidden.bs.modal'])document.addEventListener(type,event=>window.__snippetModalEvents.push({type,id:event.target.id}));});
            const trigger=sandbox.locator('[data-bs-target="#exampleModal"][data-bs-whatever]').first();await trigger.click();await sandbox.waitForFunction(()=>window.__snippetModalEvents.some(event=>event.type==='shown.bs.modal'&&event.id==='exampleModal'));check(info,'native optional modal content listener receives the trigger',await sandbox.locator('#exampleModal .modal-body input').first().inputValue()==='@mdo');check(info,'native modal installs its focus trap after shown',await sandbox.locator('#exampleModal').evaluate(el=>el.contains(document.activeElement)));await sandbox.keyboard.press('Escape');await sandbox.waitForFunction(()=>window.__snippetModalEvents.some(event=>event.type==='hidden.bs.modal'&&event.id==='exampleModal'));await sandbox.waitForFunction(()=>document.activeElement===document.querySelector('[data-bs-target="#exampleModal"][data-bs-whatever]'));check(info,'native modal opens, closes and returns focus',true);
          }else if(example.id==='tooltip'||example.id==='popover'){
            const kind=example.id,trigger=sandbox.locator('[data-bs-toggle="'+kind+'"]').first();
            check(info,'optional entrypoint ran after deferred Bootstrap',await trigger.evaluate((el,kind)=>Boolean(bootstrap[kind==='tooltip'?'Tooltip':'Popover'].getInstance(el)),kind));
            if(kind==='tooltip')await trigger.hover();else await trigger.click();
            await sandbox.locator('.'+kind+'.show').first().waitFor({state:'visible'});check(info,'native '+kind+' content is shown',true);
            if(kind==='tooltip'){
              await sandbox.locator('.tooltip.show').first().hover();await sandbox.waitForTimeout(400);check(info,'exported tooltip remains hoverable',await sandbox.locator('.tooltip.show').count()===1);
              await sandbox.keyboard.press('Escape');await sandbox.waitForFunction(()=>!document.querySelector('.tooltip.show'));check(info,'exported tooltip supports Escape dismissal',true);
            }
          }else if(example.id==='live-alert'){
            await sandbox.locator('#liveAlertBtn').click();await sandbox.locator('#liveAlertPlaceholder .alert').waitFor({state:'visible'});await sandbox.locator('#liveAlertPlaceholder [data-bs-dismiss="alert"]').click();await sandbox.locator('#liveAlertPlaceholder .alert').waitFor({state:'detached'});check(info,'native optional alert listener and dismissal work',true);
          }else if(example.id==='local-svg'){
            check(info,'local SVG logo loads on isolated origin',await sandbox.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>0&&new URL(img.src).origin===location.origin));
          }else if(example.id==='css-grid'){
            check(info,'native docs snippet CSS Grid is included',await sandbox.locator('.grid').first().evaluate(el=>getComputedStyle(el).display==='grid'));
          }else if(example.id==='carousel-remediation'){
            const carousels=await sandbox.locator('.carousel').count();check(info,'live carousel export reconstructs exactly one pause/play control',carousels===1&&await sandbox.locator('[data-tq-carousel-rotation]').count()===1);
            check(info,'live carousel export starts paused after native load initialization',!await sandbox.locator('.carousel').evaluate(el=>Boolean(bootstrap.Carousel.getInstance(el)._interval)));
            const button=sandbox.locator('[data-tq-carousel-rotation]');await button.click();check(info,'exported carousel supports explicit Play',await sandbox.locator('.carousel').evaluate(el=>Boolean(bootstrap.Carousel.getInstance(el)._interval)));await button.click();check(info,'exported carousel supports persistent Pause',!await sandbox.locator('.carousel').evaluate(el=>Boolean(bootstrap.Carousel.getInstance(el)._interval)));
            check(info,'slides-only export reconstructs exactly one fallback pair',await sandbox.locator('[data-tq-carousel-controls]').count()===1&&await sandbox.locator('[data-tq-carousel-step]').count()===2);
            await sandbox.emulateMedia({reducedMotion:'reduce'});await sandbox.waitForFunction(()=>document.querySelector('[data-tq-carousel-rotation]').disabled);
            const next=sandbox.locator('[data-tq-carousel-step="next"]'),previous=sandbox.locator('[data-tq-carousel-step="prev"]');
            await next.click();await sandbox.waitForFunction(()=>document.querySelector('.carousel-item.active')===document.querySelectorAll('.carousel-item')[1]);check(info,'slides-only exported pointer Next reaches slide2 under reduced motion',true);
            await previous.focus();await previous.press('Enter');await sandbox.waitForFunction(()=>document.querySelector('.carousel-item.active')===document.querySelectorAll('.carousel-item')[0]);check(info,'slides-only exported keyboard Previous reaches slide1 under reduced motion',true);
            await next.focus();await next.press('Space');await sandbox.waitForFunction(()=>document.querySelector('.carousel-item.active')===document.querySelectorAll('.carousel-item')[1]);check(info,'slides-only exported keyboard Next reaches slide2 under reduced motion',true);
            await previous.click();await sandbox.waitForFunction(()=>document.querySelector('.carousel-item.active')===document.querySelectorAll('.carousel-item')[0]);check(info,'slides-only exported pointer Previous reaches slide1 under reduced motion',true);
          }else if(example.id.includes('validation-')){
            check(info,'live validation export reconstructs one clean error summary',await sandbox.locator('[data-tq-validation-summary]').count()===1&&await sandbox.locator('[data-tq-validation-summary]').isHidden());
            await sandbox.locator('form [type="submit"]').click();
            const state=await sandbox.locator('form').evaluate(form=>{const errors=[...form.elements].filter(el=>el.willValidate&&!el.validity.valid),summary=form.querySelector('[data-tq-validation-summary]');return{errors:errors.length,links:summary.querySelectorAll('a').length,focused:summary===document.activeElement,associated:errors.every(el=>el.getAttribute('aria-invalid')==='true'&&(el.getAttribute('aria-describedby')||'').split(/\s+/).map(id=>document.getElementById(id)).some(node=>node?.classList.contains('invalid-feedback')&&node.getClientRects().length))};});
            check(info,'exported form exposes persistent errors and focuses summary',state.errors>0&&state.links===state.errors&&state.focused&&state.associated,state);
            await sandbox.locator('[data-tq-validation-summary] a').first().click();check(info,'exported form summary links focus the invalid field',await sandbox.evaluate(()=>document.activeElement.matches('input,select,textarea')));
          }
          check(info,'isolated project has no external requests or asset errors',foreign.length===0&&badResponses.length===0,{foreign,badResponses});
          check(info,'isolated project has no JavaScript errors',errors.length===0,{errors});
          const bytes=Buffer.byteLength(JSON.stringify({files,template,title:fields['project[title]'],description:fields['project[description]']}));
          report.projects.push({...info,template,bytes,urlEncodedFormBytes:Buffer.byteLength(new URLSearchParams(posted.entries).toString()),files:Object.fromEntries(Object.entries(files).map(([name,body])=>[name,{bytes:Buffer.byteLength(body),sha256:sha(body)}])),requests,entrypointAdapter:template==='javascript'?'documented JavaScript-template index.js entrypoint inserted after deferred bundle':'native HTML template'});
          projectFiles.delete(key);
          console.log(browserName+' '+example.id+' '+mode.theme+' '+mode.direction+': captured and exercised');
        }catch(error){report.findings.push({...info,error:error.message});}
        finally{await capture.close();if(sandbox)await sandbox.close();}
      }
    }finally{await browser.close();}
  }
}finally{await new Promise(resolve=>server.close(resolve));}
report.assetsAtEnd=await fingerprints();
const assetsFrozen=JSON.stringify(report.assetsAtStart)===JSON.stringify(report.assetsAtEnd);
if(!assetsFrozen)report.findings.push({error:'Snippet export inputs changed during measurement'});
report.runtimeStatus='complete';report.finished=new Date().toISOString();
report.summary={sourceProofPass:report.sourceException.pass,sourceBoundaries:sourceSubstitutions.length,browsers:selected,projects:report.projects.length,expectedProjects:selected.length*modes.length*cases.length,checks:report.checks.length,passed:report.checks.filter(item=>item.pass).length,findings:report.findings.length,minimumPayloadBytes:Math.min(...report.projects.map(item=>item.bytes)),maximumPayloadBytes:Math.max(...report.projects.map(item=>item.bytes)),externalProjectsSubmitted:0,assetsFrozen};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
if(report.findings.length||report.projects.length!==report.summary.expectedProjects)process.exitCode=1;
