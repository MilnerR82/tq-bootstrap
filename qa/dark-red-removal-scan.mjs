import fs from 'node:fs/promises';
import path from 'node:path';
const roots=['src','dist','docs-source/site/src','docs-source/site/dist','docs/5.3','assets','lessons','examples','about','components','getting-started','migration'];
const retired=/#8a0008\b|%238a0008\b|(?:rgba?\(\s*)?138\s*,\s*0\s*,\s*8\b/ig;
const findings=[];let count=0;
async function scan(folder){
 for(const entry of await fs.readdir(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory())await scan(file);
  else if(/\.(css|scss|html|astro|js|svg|map)$/.test(file)){
   count++; const body=await fs.readFile(file,'utf8'); const matches=[...body.matchAll(retired)];
   if(matches.length)findings.push({file,matches:matches.length});
  }
 }
}
for(const root of roots)await scan(root);
const report={scope:'Active framework, published documentation, example and lesson code; historical audit data and upstream reference snapshots excluded.',filesChecked:count,findings};
await fs.mkdir('qa/results/dark-red-removal',{recursive:true});
await fs.writeFile('qa/results/dark-red-removal/removal-scan.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(findings.length)process.exitCode=1;
