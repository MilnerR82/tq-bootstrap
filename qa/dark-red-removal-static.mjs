import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import {canonicalSvgContent} from './colour-substitution-proof.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const out='qa/results/dark-red-removal';
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={started:new Date().toISOString(),scope:'User-selected TQ semantic status palette, all CSS distributions and original JavaScript. Static Sass/CSS checks; not complete-page WCAG conformance.',checks:[],geometry:[]};
function check(name,pass,details){report.checks.push({name,pass,...details});}
const roles={primary:'#e31b23',secondary:'#696567',success:'#198754',info:'#e31b23',warning:'#ef7622',danger:'#e31b23',light:'#f1efed',dark:'#373234'};
const hues={blue:'#0d6efd',indigo:'#6610f2',purple:'#6f42c1',orange:'#fd7e14',yellow:'#ffc107',green:'#198754',teal:'#20c997',cyan:'#0dcaf0',pink:'#f32a7c',red:'#e31b23'};
const css=await fs.readFile('dist/css/bootstrap.css','utf8');
const ast=postcss.parse(css);
const vars={};ast.walkRules(r=>{if(r.selector===':root,\n[data-bs-theme=light]'||r.selector===':root,\n[data-bs-theme="light"]')r.walkDecls(d=>{vars[d.prop]=d.value.toLowerCase()});});
for(const [role,value] of Object.entries({...roles,...hues}))check('Root '+role,vars['--bs-'+role]===value,{actual:vars['--bs-'+role],expected:value});
for(const role of ['light','secondary','tertiary']){const key=role==='light'?'--bs-light':'--bs-'+role+'-bg';check('Light neutral '+role,vars[key]==='#f1efed',{actual:vars[key]});}
check('Main pages white',vars['--bs-body-bg']==='#fff'||vars['--bs-body-bg']==='#ffffff',{actual:vars['--bs-body-bg']});
const parse=v=>{if(/^#[\da-f]{3}$/i.test(v))return [...v.slice(1)].map(x=>parseInt(x+x,16));if(/^#[\da-f]{6}$/i.test(v))return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16));if(/^rgb\(/.test(v))return v.match(/[\d.]+/g).map(Number);if(v==='white')return [255,255,255];if(v==='black')return [0,0,0];return null;};
const lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
for(const role of Object.keys(roles)){
 const decls={};ast.walkRules(r=>{if(r.selector==='.btn-'+role)r.walkDecls(d=>decls[d.prop]=d.value)});
 for(const state of ['', 'hover-', 'active-']){
  const fg=parse(decls['--bs-btn-'+state+'color']),bg=parse(decls['--bs-btn-'+state+'bg']);
  const ratio=fg&&bg?contrast(fg,bg):null;
  check('Solid '+role+' '+(state||'rest'),ratio>=4.5,{ratio,foreground:decls['--bs-btn-'+state+'color'],background:decls['--bs-btn-'+state+'bg']});
 }
}
const files=await fs.readdir('dist/css');
for(const name of files.filter(n=>n.endsWith('.css'))){const text=await fs.readFile('dist/css/'+name,'utf8');const map=JSON.parse(await fs.readFile('dist/css/'+name+'.map','utf8'));check('Distribution '+name,text.length>100&&map.sources.length>0&&map.sourcesContent.length===map.sources.length,{bytes:Buffer.byteLength(text),sha256:sha(text)});}
async function walk(dir){const all=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else all.push(p);}return all;}
for(const p of await walk('dist/js')){const rel=path.relative('dist/js',p);const source=rel.startsWith('plugins'+path.sep)?path.join('node_modules/bootstrap/js',rel.slice(8)):path.join('node_modules/bootstrap/dist/js',rel);check('Original JS '+rel,sha(await fs.readFile(p))===sha(await fs.readFile(source)),{});}

// Independently compile the saved preceding theme and current source. Retain
// geometry, typography, opacity, motion, selectors and SVG paths in comparison.
const paint=/^(color|background-color|border(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?-color|outline-color|text-decoration-color|caret-color|accent-color|fill|stroke)$/;
const colourVars=/^--(?:tq-|bs-(?:(?:blue|indigo|purple|pink|red|orange|yellow|green|teal|cyan|black|white|gray(?:-\d+|-dark)?|primary|secondary|success|info|warning|danger|light|dark)(?:-|$)|.*(?:color|colour|rgb|bg)(?:-|$)))/;
const mask=value=>canonicalSvgContent(value).replace(/rgba?\([^)]*\)|#[\da-f]{3,8}\b|\b(?:white|black|transparent)\b/gi,'<paint>').replace(/var\(--[\w-]*(?:color|colour|rgb|bg)[\w-]*(?:,\s*[^()]*)?\)/g,'<paint>');
function geometry(text){const rows=[];postcss.parse(text).walkDecls(d=>{if(paint.test(d.prop)||colourVars.test(d.prop))return;let parent=d.parent,scope=[];while(parent&&parent.type!=='root'){scope.unshift(parent.type==='rule'?parent.selector:'@'+parent.name+' '+parent.params);parent=parent.parent;}rows.push([scope.join(' / '),d.prop,mask(d.value),Boolean(d.important)]);});return rows;}
for(const family of ['tq-bootstrap','tq-bootstrap-grid','tq-bootstrap-reboot','tq-bootstrap-utilities']){
 const options={loadPaths:['node_modules'],silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}};
 const a=geometry(sass.compile('.cache/dark-red-before/scss/'+family+'.scss',options).css),b=geometry(sass.compile('src/scss/'+family+'.scss',options).css);
 const differences=[];for(let i=0;i<Math.max(a.length,b.length);i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i]))differences.push({index:i,before:a[i],after:b[i]});
 report.geometry.push({family,declarations:a.length,pass:!differences.length,differences:differences.slice(0,30)});
 check('Non-colour preservation '+family,!differences.length,{declarations:a.length,differenceCount:differences.length});
}
report.finished=new Date().toISOString();report.summary={checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length};
await fs.writeFile(out+'/static.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({summary:report.summary,failures:report.checks.filter(c=>!c.pass),geometry:report.geometry.filter(c=>!c.pass)},null,2));
if(report.summary.failed)process.exitCode=1;
