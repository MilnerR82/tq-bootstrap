import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import archiver from 'archiver';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
// The former colour-only gate remains intact in qa/remediation-source/package-before.mjs.
const {evidence,inventories}=await import('../qa/remediation/acceptance.mjs');
fs.mkdirSync('release',{recursive:true});const filename='release/tq-bootstrap-1.0.0.zip';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]).sort()}
await new Promise((resolve,reject)=>{const output=fs.createWriteStream(filename),archive=archiver('zip',{zlib:{level:9}});output.on('close',resolve);output.on('error',reject);archive.on('error',reject);archive.on('warning',reject);archive.pipe(output);
for(const dir of ['src','dist','upstream','assets/bootstrap-icons','qa'])archive.glob('**/*',{cwd:dir,dot:true,ignore:['**/*.tmp','**/.cache/**',...(dir==='qa'?['results/package-portability.json']:[])]},{prefix:'tq-bootstrap/'+dir});
for(const file of ['package.json','package-lock.json','README.md','LICENSE','THIRD-PARTY-NOTICES.md','docs/INTEGRATION.md',...files('scripts')])archive.file(file,{name:'tq-bootstrap/'+file});
archive.glob('**/*',{cwd:'docs-source',dot:true,ignore:['node_modules/**','**/node_modules/**','site/public/**','site/.astro/**','site/dist/**','**/.cache/**','**/.DS_Store','build-docs.log','tq-customize.mjs']},{prefix:'tq-bootstrap/docs-source'});
archive.glob('**/*',{cwd:'docs-source/site/dist',dot:true},{prefix:'tq-bootstrap'});archive.finalize();});
const body=fs.readFileSync(filename),outputs=[{file:filename,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')}];
fs.writeFileSync('release/checksums.json',JSON.stringify({version:'1.0.0',bootstrap:'5.3.8',revision:'2026-10-22 accessibility remediation',scope:'Native Bootstrap framework, docs and examples with TQ colours and separately documented accessibility corrections. Technical checks pass; full WCAG conformance is not established.',built:new Date().toISOString(),inventories,evidence,outputs},null,2)+'\n');
fs.writeFileSync('release/SHA256SUMS.txt',outputs.map(e=>e.sha256+'  '+path.basename(e.file)).join('\n')+'\n');console.log(filename+': '+body.length+' bytes; '+outputs[0].sha256);
