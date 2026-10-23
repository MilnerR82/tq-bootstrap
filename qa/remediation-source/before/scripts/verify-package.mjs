import {readFile,readdir,access,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
const checks=[];const hash=body=>createHash('sha256').update(body).digest('hex');
const record=(name,pass,evidence)=>checks.push({name,pass,evidence});
const manifest=JSON.parse(await readFile('dist/manifest.json','utf8'));
for(const item of manifest.files){try{const bytes=await readFile(item.path);record(`Distribution integrity: ${item.path}`,bytes.length===item.bytes&&hash(bytes)===item.sha256);}catch{record(`Distribution present: ${item.path}`,false);}}
for(const name of ['bootstrap','bootstrap-grid','bootstrap-reboot','bootstrap-utilities'])for(const direction of ['','.rtl'])for(const min of ['','.min']){const file=`dist/css/${name}${direction}${min}.css`;try{await access(file);await access(file+'.map');record(`Standard Bootstrap CSS: ${file}`,true);}catch{record(`Standard Bootstrap CSS: ${file}`,false);}}
const classes=css=>{const names=new Set();postcss.parse(css).walkRules(rule=>{for(const match of rule.selector.matchAll(/\.([a-zA-Z_-][\w-]*)/g))names.add(match[1]);});return names;};
const original=classes(await readFile('upstream/bootstrap/dist/css/bootstrap.css','utf8')),themed=classes(await readFile('dist/css/bootstrap.css','utf8'));
const missing=[...original].filter(name=>!themed.has(name));record('Complete original Bootstrap CSS class surface',!missing.length,{original:original.size,themed:themed.size,missing});
record('No additional TQ component classes',[...themed].every(name=>!name.startsWith('tq-')));
record('Only standard Bootstrap JavaScript files',(await readdir('dist/js')).every(name=>!name.startsWith('tq-')));
async function files(dir){const list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const item=path.join(dir,entry.name);if(entry.isDirectory())list.push(...await files(item));else list.push(item);}return list;}
for(const [source,target,label] of [['upstream/bootstrap/dist/js','dist/js','Bootstrap distribution JavaScript'],['upstream/bootstrap/js','dist/js/plugins','Bootstrap individual JavaScript'],['upstream/bootstrap-icons','assets/bootstrap-icons','Bootstrap Icons']]){const differences=[];const sourceFiles=await files(source);for(const file of sourceFiles){const relative=path.relative(source,file);try{if(!Buffer.from(await readFile(file)).equals(await readFile(path.join(target,relative))))differences.push(relative);}catch{differences.push(relative);}}record(`Unchanged ${label}`,!differences.length,{files:sourceFiles.length,differences});}
for(const file of ['index.html','docs/5.3/getting-started/introduction/index.html','docs/5.3/components/buttons/index.html','docs/5.3/helpers/color-background/index.html','docs-source/site/src/layouts/DocsLayout.astro','README.md','docs/INTEGRATION.md']){try{await access(file);record(`Required Bootstrap website/source: ${file}`,true);}catch{record(`Required Bootstrap website/source: ${file}`,false);}}
const page=await readFile('docs/5.3/components/buttons/index.html','utf8');record('Actual Bootstrap documentation structure',['bd-sidebar','bd-main','bd-toc','bd-example-snippet','btn-clipboard'].every(marker=>page.includes(marker)));
record('Published documentation uses unchanged Bootstrap bundle',hash(await readFile('docs/5.3/dist/js/bootstrap.bundle.min.js'))===hash(await readFile('upstream/bootstrap/dist/js/bootstrap.bundle.min.js')));
record('Published documentation uses the current TQ theme',hash(await readFile('docs/5.3/dist/css/bootstrap.min.css'))===hash(await readFile('dist/css/bootstrap.min.css')));
record('Superseded custom gallery absent',!page.includes('gallery-main')&&!page.includes('tq-bootstrap.bundle'));
const failures=checks.filter(item=>!item.pass);await mkdir('qa/results',{recursive:true});await writeFile('qa/results/package-integrity.json',JSON.stringify({date:new Date().toISOString(),scope:'Original Bootstrap website and JavaScript with TQ Sass theme',checks,failures,summary:{checks:checks.length,passed:checks.length-failures.length,failed:failures.length}},null,2));console.log(`${checks.length} integrity checks; ${failures.length} failures.`);if(failures.length){console.error(failures);process.exitCode=1;}
