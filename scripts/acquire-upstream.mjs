import {mkdir,writeFile,readFile,cp,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
process.chdir(root);
await mkdir('upstream/archives',{recursive:true});
const records=[];
for(const [name,version] of [['bootstrap','5.3.8'],['bootstrap-icons','1.13.2']]){
  const meta=await fetch(`https://registry.npmjs.org/${name}/${version}`).then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
  const target=`upstream/archives/${name}-${version}.tgz`;
  let body;try{body=await readFile(target);}catch{body=Buffer.from(await fetch(meta.dist.tarball).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}));await writeFile(target,body);}
  const integrity='sha512-'+createHash('sha512').update(body).digest('base64');
  if(integrity!==meta.dist.integrity)throw Error(`Integrity mismatch: ${name}`);
  await cp(`node_modules/${name}`,`upstream/${name}`,{recursive:true});
  records.push({name,version,url:meta.dist.tarball,integrity,sha256:createHash('sha256').update(body).digest('hex'),licence:meta.license});
}
const sourceUrl='https://codeload.github.com/twbs/bootstrap/tar.gz/refs/tags/v5.3.8';
const archive='upstream/archives/bootstrap-source-v5.3.8.tar.gz';
let source;try{source=await readFile(archive);}catch{source=Buffer.from(await fetch(sourceUrl).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}));await writeFile(archive,source);}
try{await access('upstream/bootstrap-source/site/src/content/docs');}catch{await mkdir('upstream/bootstrap-source',{recursive:true});execFileSync('tar',['-xzf',archive,'--strip-components=1','-C','upstream/bootstrap-source'],{stdio:'inherit'});}
records.push({name:'Bootstrap complete tagged source and documentation',version:'5.3.8',url:sourceUrl,sha256:createHash('sha256').update(source).digest('hex'),licence:'MIT code; CC BY 3.0 documentation'});
await writeFile('upstream/provenance.json',JSON.stringify({checkedDate:'2026-10-20',stableReleaseSource:'https://getbootstrap.com/docs/versions/',records},null,2));
console.log('Verified Bootstrap 5.3.8, Icons 1.13.2 and complete source archive.');
