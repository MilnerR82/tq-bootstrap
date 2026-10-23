import {cp,readdir,access,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'docs-source/site/dist');
await access(path.join(output,'docs/5.3/components/buttons/index.html'));
for(const item of await readdir(output,{withFileTypes:true})){
  await cp(path.join(output,item.name),path.join(root,item.name),{recursive:true});
}
// Remove only the known upstream-domain publication artifact.
try{if((await (await import('node:fs/promises')).readFile(path.join(root,'CNAME'),'utf8')).trim()==='getbootstrap.com')await rm(path.join(root,'CNAME'));}catch(error){if(error.code!=='ENOENT')throw error;}
// Retire only obsolete generated, content-hashed CSS/JS assets. Keeping old
// bundles here would make a fresh audit observe files a clean build omits.
const assetRelative='docs/5.3/assets';
const currentAssets=new Set(await readdir(path.join(output,assetRelative)));
for(const item of await readdir(path.join(root,assetRelative),{withFileTypes:true})){
  if(!item.isFile()||currentAssets.has(item.name)||!/^.+\.[A-Za-z0-9_-]{8}\.(?:css|js)$/.test(item.name))continue;
  const target=path.resolve(root,assetRelative,item.name);
  if(!target.startsWith(path.resolve(root,assetRelative)+path.sep))throw new Error('Generated asset cleanup escaped its directory');
  await rm(target);
}
console.log('Published the original Bootstrap website with TQ colour substitutions.');
