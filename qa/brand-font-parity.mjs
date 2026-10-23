import fs from 'node:fs/promises';
import * as sass from 'sass';
import postcss from 'postcss';
const options={loadPaths:['node_modules'],silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}};
function declarations(css){const values=[];postcss.parse(css).walkDecls(d=>{const context=[];let p=d.parent;while(p&&p.type!=='root'){context.unshift(p.selector||'@'+p.name+' '+p.params);p=p.parent;}values.push({context:context.join(' / '),property:d.prop,value:d.value,important:!!d.important});});return values;}
const results=[];
for(const name of ['tq-bootstrap','tq-bootstrap-reboot','tq-bootstrap-grid','tq-bootstrap-utilities']){
 const before=declarations(sass.compile(`.cache/brand-font-before/${name}.scss`,options).css),after=declarations(sass.compile(`src/scss/${name}.scss`,options).css);
 const changes=[];for(let i=0;i<Math.max(before.length,after.length);i++)if(JSON.stringify(before[i])!==JSON.stringify(after[i]))changes.push({before:before[i],after:after[i]});
 const pass=changes.every(c=>c.before?.property==='--bs-font-sans-serif'&&c.after?.property==='--bs-font-sans-serif'&&c.before.context===c.after.context&&c.after.value==='"Helvetica Neue", Arial, sans-serif');
 results.push({name,pass,changes});
}
await fs.mkdir('qa/results/brand-font',{recursive:true});
await fs.writeFile('qa/results/brand-font/exact-parity.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
