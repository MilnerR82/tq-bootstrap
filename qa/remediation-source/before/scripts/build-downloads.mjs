import {mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import archiver from 'archiver';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const sha=body=>createHash('sha256').update(body).digest('hex');
const stamp=new Date('2026-10-20T00:00:00Z');
async function files(dir,prefix=''){
 const output=[];
 for(const entry of (await readdir(path.join(dir,prefix),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const relative=path.join(prefix,entry.name);
  if(entry.isDirectory())output.push(...await files(dir,relative));
  else output.push(relative.replaceAll('\\','/'));
 }
 return output;
}
export async function buildDownloads(){
 const docs=path.join(root,'docs-source/site/dist');
 const output=path.join(docs,'release');
 await mkdir(output,{recursive:true});
 const definitions=[
  {kind:'dist',filename:'tq-bootstrap-1.0.0-dist.zip',prefix:'tq-bootstrap-dist',directories:[['dist/css','css'],['dist/js','js']],files:['dist/BOOTSTRAP-LICENSE.txt','dist/POPPER-LICENSE.txt'],readme:'TQ Bootstrap 1.0.0 compiled distribution\n\nBootstrap 5.3.8 CSS with TAFE Queensland colour substitutions and unchanged Bootstrap JavaScript. Include css/bootstrap.min.css and js/bootstrap.bundle.min.js. The bundle includes Popper. Expanded/minified, LTR/RTL and partial CSS builds and source maps are included. The js/plugins tree contains the original individual modules. No custom TQ runtime is required.\n'},
  {kind:'source',filename:'tq-bootstrap-1.0.0-source.zip',prefix:'tq-bootstrap-source',directories:[
   ['src/scss','src/scss'],['upstream/bootstrap','upstream/bootstrap'],
   ...['build','js','scss','site/src','site/data','site/static'].map(directory=>['docs-source/'+directory,'docs-source/'+directory])
  ],files:[
   'package.json','package-lock.json','scripts/build.mjs','scripts/build-downloads.mjs','scripts/serve.mjs','scripts/publish-docs.mjs',
   'upstream/bootstrap-source/.browserslistrc','LICENSE','THIRD-PARTY-NOTICES.md',
   ...['_tq-tokens.scss','.browserslistrc','config.yml','LICENSE','package.json','package-lock.json','README-TQ.md','build-tq-docs.mjs','site/astro.config.ts','site/postcss.config.cjs','site/tsconfig.json','site/.prettierrc.json'].map(file=>'docs-source/'+file)
  ],readme:'TQ Bootstrap 1.0.0 framework and documentation source\n\nIncludes the TQ colour tokens, complete original Bootstrap 5.3.8 npm package, documentation source/data/static assets, both pinned dependency locks, and the framework/documentation build helpers. With Node.js 22 or newer, run these commands from this directory:\n\n  npm ci --no-audit --no-fund\n  node scripts/build.mjs\n  npm --prefix docs-source ci --ignore-scripts --no-audit --no-fund\n  node docs-source/build-tq-docs.mjs\n  node scripts/publish-docs.mjs\n  node scripts/serve.mjs\n\nOpen http://127.0.0.1:5198/. Dependency installation requires a network connection. The framework build creates dist; the documentation build creates docs-source/site/dist with all native pages and the three independent downloads. Publishing copies that website to this directory for preview. Native hosted services retain their original network requirements.\n\nGenerated output, dependency folders, caches and ZIPs are excluded from this source archive. Rebuilding its downloads uses explicit source paths and does not embed generated archives recursively. QA acceptance datasets, upstream acquisition/provenance archives and audit tooling mentioned by shared package metadata or maintainer notes are supplied in the separate complete tq-bootstrap-1.0.0.zip release.\n'},
  {kind:'examples',filename:'tq-bootstrap-1.0.0-examples.zip',prefix:'tq-bootstrap-examples',directories:[['docs-source/site/dist/docs/5.3/examples','docs/5.3/examples'],['docs-source/site/dist/docs/5.3/dist','docs/5.3/dist'],['docs-source/site/dist/docs/5.3/assets','docs/5.3/assets'],['docs-source/site/src/assets/examples','source/examples']],files:['scripts/serve.mjs','dist/BOOTSTRAP-LICENSE.txt','dist/POPPER-LICENSE.txt','LICENSE','THIRD-PARTY-NOTICES.md'],readme:'TQ Bootstrap 1.0.0 examples\n\nIncludes all 40 original Bootstrap standalone example pages with TQ colours, their shared local framework/assets, and their source templates. Preserve this folder structure: the native pages use /docs/5.3 asset URLs. Run node scripts/serve.mjs from this directory and open http://127.0.0.1:5198/docs/5.3/examples/album/ (or another example directory).\n\nThis compact download contains examples, not the entire documentation website. General documentation links, hosted Chart.js/maps/services and external media retain their upstream network requirements. The complete website is supplied in tq-bootstrap-1.0.0.zip.\n'}
 ];
 const records=[];
 for(const definition of definitions){
  const entries=[];
  for(const [directory,destination]of definition.directories)for(const file of await files(path.join(root,directory)))entries.push({source:directory+'/'+file,name:definition.prefix+'/'+destination+'/'+file});
  for(const file of definition.files)entries.push({source:file,name:definition.prefix+'/'+file});
  for(const entry of entries){const body=await readFile(path.join(root,entry.source));entry.bytes=body.length;entry.sha256=sha(body);}
  const readmeName=definition.prefix+'/README.txt';
  const filename=path.join(output,definition.filename);
  await new Promise((resolve,reject)=>{
   const stream=fs.createWriteStream(filename),archive=archiver('zip',{zlib:{level:9}});
   stream.on('close',resolve);stream.on('error',reject);archive.on('error',reject);
   archive.on('warning',reject);archive.pipe(stream);
   for(const entry of entries)archive.file(path.join(root,entry.source),{name:entry.name,date:stamp,mode:0o644});
   archive.append(definition.readme,{name:readmeName,date:stamp,mode:0o644});
   archive.finalize();
  });
  const body=await readFile(filename);
  records.push({kind:definition.kind,url:'/release/'+definition.filename,file:definition.filename,bytes:(await stat(filename)).size,sha256:sha(body),entries:[...entries.map(({name,bytes,sha256})=>({name,bytes,sha256})),{name:readmeName,bytes:Buffer.byteLength(definition.readme),sha256:sha(Buffer.from(definition.readme))}]});
 }
 await writeFile(path.join(output,'downloads.json'),JSON.stringify({version:'1.0.0',bootstrap:'5.3.8',scope:'Independent nonrecursive documentation downloads; the complete release ZIP is not embedded in itself.',downloads:records},null,2)+'\n');
 return records.map(({kind,file,bytes,sha256})=>({kind,file,bytes,sha256}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildDownloads(),null,2));
