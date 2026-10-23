import {mkdir,writeFile,readFile,cp,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import rtlcss from 'rtlcss';
import CleanCSS from 'clean-css';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
const browsers=(await readFile('upstream/bootstrap-source/.browserslistrc','utf8')).split(/\r?\n/).map(line=>line.replace(/#.*/,'').trim()).filter(Boolean);
const prefix=()=>autoprefixer({cascade:false,overrideBrowserslist:browsers});
await mkdir('dist/css',{recursive:true});await mkdir('dist/js',{recursive:true});await mkdir('dist/scss',{recursive:true});
const outputs=[];
for(const name of ['tq-bootstrap','tq-bootstrap-grid','tq-bootstrap-reboot','tq-bootstrap-utilities']){
  const result=sass.compile(`src/scss/${name}.scss`,{loadPaths:['node_modules'],sourceMap:true,sourceMapIncludeSources:true,style:'expanded',silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn:()=>{},debug:()=>{}}});
  const sourceMap=structuredClone(result.sourceMap);
  sourceMap.sources=sourceMap.sources.map(source=>{let local=fileURLToPath(source);local=local.replace(path.join('node_modules','bootstrap'),path.join('upstream','bootstrap'));return path.relative(path.join(root,'dist/css'),local).replaceAll('\\','/');});
  // Match Bootstrap's official css-prefix stage and original browser targets.
  const prefixed=await postcss([prefix()]).process(result.css,{from:`dist/css/${name.replace(/^tq-/, '')}.css`,to:`dist/css/${name.replace(/^tq-/, '')}.css`,map:{prev:sourceMap,inline:false,annotation:false}});
  for(const direction of ['ltr','rtl']){
    const base=`${name.replace(/^tq-/, '')}${direction==='rtl'?'.rtl':''}`;
    let css=prefixed.css,map=structuredClone(prefixed.map.toJSON());
    if(direction==='rtl'){const converted=await postcss([prefix(),rtlcss]).process(css,{from:`dist/css/${name.replace(/^tq-/, '')}.css`,to:`dist/css/${base}.css`,map:{prev:map,inline:false,annotation:false}});css=converted.css;map=converted.map.toJSON();}
    await writeFile(`dist/css/${base}.css`,`${css}\n/*# sourceMappingURL=${base}.css.map */\n`);
    await writeFile(`dist/css/${base}.css.map`,JSON.stringify(map));outputs.push(`dist/css/${base}.css`);
    const minified=new CleanCSS({level:1,format:{breakWith:'lf'},rebaseTo:path.join(root,'dist/css'),sourceMap:true,sourceMapInlineSources:true}).minify(css,JSON.stringify(map));
    if(minified.errors.length)throw new Error(minified.errors.join('\n'));
    await writeFile(`dist/css/${base}.min.css`,`${minified.styles}\n/*# sourceMappingURL=${base}.min.css.map */\n`);
    await writeFile(`dist/css/${base}.min.css.map`,minified.sourceMap.toString());outputs.push(`dist/css/${base}.min.css`);
  }
}
await cp('src/scss','dist/scss',{recursive:true});
await cp('node_modules/bootstrap/dist/js','dist/js',{recursive:true});
await cp('node_modules/bootstrap/js','dist/js/plugins',{recursive:true});
await cp('node_modules/bootstrap-icons','assets/bootstrap-icons',{recursive:true});
await cp('node_modules/bootstrap/LICENSE','dist/BOOTSTRAP-LICENSE.txt');
await cp('node_modules/@popperjs/core/LICENSE.md','dist/POPPER-LICENSE.txt');
await cp('node_modules/bootstrap-icons/LICENSE','assets/bootstrap-icons/LICENSE');
const files=[];async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())await walk(p);else if(p.replaceAll('\\','/')!=='dist/manifest.json'){const body=await readFile(p);files.push({path:p.replaceAll('\\','/'),bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});}}}await walk('dist');
await writeFile('dist/manifest.json',JSON.stringify({packageVersion:'1.0.0',bootstrap:'5.3.8',bootstrapIcons:'1.13.2',files},null,2));
console.log(`Built ${outputs.length} themed Bootstrap CSS distributions, source maps, Sass and unchanged original Bootstrap JavaScript.`);
