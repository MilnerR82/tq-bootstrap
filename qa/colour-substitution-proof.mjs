import {createHash} from 'node:crypto';

const sha=value=>createHash('sha256').update(value).digest('hex');
const namedColours=new Set(['black','white','red','blue','green','yellow','purple','orange','pink','gray','grey','silver','teal','aqua','fuchsia','maroon','navy','lime','olive']);
const finite=value=>Number.isFinite(Number(value));
const alpha=value=>{value=value.trim();const n=value.endsWith('%')?Number(value.slice(0,-1))/100:Number(value);return Number.isFinite(n)?String(n):value;};
function colourToken(raw){
 const hex=raw.match(/^(?:#|%23)([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);
 if(hex){const value=hex[1];return {mask:`<paint alpha=${value.length===4?parseInt(value[3]+value[3],16)/255:value.length===8?parseInt(value.slice(6),16)/255:1}>`,rgb:value.length<=4?[...value.slice(0,3)].map(n=>parseInt(n+n,16)):value.slice(0,6).match(/../g).map(n=>parseInt(n,16))};}
 const fn=raw.match(/^(rgba?|hsla?)\(([^()]*)\)$/i);
 if(fn){const components=fn[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);if(components.length<3||components.length>4)return null;const a=components.length===4?alpha(components[3]):'1';return {mask:`<paint alpha=${a}>`,rgb:fn[1].toLowerCase().startsWith('rgb')&&components.slice(0,3).every(finite)?components.slice(0,3).map(Number):null};}
 if(namedColours.has(raw.toLowerCase()))return {mask:'<paint alpha=1>',rgb:raw.toLowerCase()==='black'?[0,0,0]:raw.toLowerCase()==='white'?[255,255,255]:null};
 return null;
}
export function maskLiteralPaint(value){
 return value.replace(/var\(--bs-(?:link-color|link-hover-color|secondary-color|emphasis-color|body-color|body-bg|red|danger-text-emphasis)\)/g,'<paint alpha=1>').replace(/rgba?%28[\d.,%\s]+%29/gi,raw=>colourToken(decodeURIComponent(raw))?.mask??raw).replace(/((?:--[\w-]+-rgb)\s*:\s*)([\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+)(?=\s*[;}])/g,'$1<paint-rgb>')
 .replace(/(?:#|%23)(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})(?![a-z\d_-])|\b(?:rgba?|hsla?)\([^()]*\)/gi,raw=>colourToken(raw)?.mask??raw);
}
export function literalPaintTokens(value){const records=[];for(const match of value.matchAll(/(?:#|%23)(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})(?![a-z\d_-])|\b(?:rgba?|hsla?)\([^()]*\)|rgba?%28[\d.,%\s]+%29/gi)){const token=colourToken(match[0].includes('%28')?decodeURIComponent(match[0]):match[0]);if(token)records.push({value:match[0],offset:match.index,line:value.slice(0,match.index).split('\n').length,...token});}for(const match of value.matchAll(/(--[\w-]+-rgb)\s*:\s*([\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+)(?=\s*[;}])/g))records.push({value:match[2],property:match[1],offset:match.index,line:value.slice(0,match.index).split('\n').length,mask:'<paint-rgb>',rgb:match[2].split(',').map(Number)});return records;}
// Self-contained so the identical function can run inside the browser snapshot.
// Only XML paint attribute values change; all alpha, path and geometry survive.
export function canonicalSvgContent(value){
 return value.replace(/url\("(data:image\/svg\+xml(?:;charset=utf-8)?,[^"\n]*)"\)/gi,(whole,uri)=>{
  const comma=uri.indexOf(',');let svg;try{svg=decodeURIComponent(uri.slice(comma+1));}catch{return whole;}
  svg=svg.replace(/\b(fill|stroke|color|stop-color|flood-color|lighting-color)=(['"])(.*?)\2/gi,(attribute,name,quote,paint)=>{
   const hex=paint.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);let alpha;
   if(hex){const h=hex[1];alpha=h.length===4?parseInt(h[3]+h[3],16)/255:h.length===8?parseInt(h.slice(6),16)/255:1;}
   else{const rgb=paint.match(/^rgba?\(([^()]*)\)$/i);if(!rgb)return attribute;const parts=rgb[1].split(/\s*[,/]\s*|\s+/).filter(Boolean);if(parts.length<3||parts.length>4)return attribute;const a=parts.length===4?parts[3]:'1';alpha=a.endsWith('%')?Number(a.slice(0,-1))/100:Number(a);if(!Number.isFinite(alpha))return attribute;}
   return name+'='+quote+'<paint alpha='+alpha+'>'+quote;
  });
  return 'url("'+uri.slice(0,comma+1)+encodeURIComponent(svg)+'")';
 });
}
const paintExpressionPairs=new Map([
 ["background: getData('grays')[5].hex,","background: '#696567',"],
 ["color: getData('grays')[2].hex,","color: '#fff',"]
]);
const paintAliases=new Map([
 ['site/src/assets/examples/blog/blog.css',new Map([['#727272','var(--bs-secondary-color)']])],
 ['site/src/assets/examples/blog/blog.rtl.css',new Map([['#727272','var(--bs-secondary-color)']])],
 ['site/src/assets/examples/dropdowns/dropdowns.css',new Map([['.dropdown-item-danger {\n  color: var(--bs-red);\n}','.dropdown-item-danger {\n  color: var(--bs-danger-text-emphasis);\n}']])],
 ['site/src/assets/examples/dashboard/dashboard.css',new Map([['#2470dc','var(--bs-link-hover-color)']])],
 ['site/src/assets/examples/dashboard/dashboard.rtl.css',new Map([['#2470dc','var(--bs-link-hover-color)']])],
 ['site/src/assets/examples/offcanvas-navbar/offcanvas-navbar.css',new Map([['#6c757d','var(--bs-secondary-color)'],['#007bff','var(--bs-link-color)'],['color: #343a40;','color: var(--bs-emphasis-color);']])]
]);
const chartPaintPairs=new Map([
 ['  new Chart(ctx, {','  const chart = new Chart(ctx, {'],
 ['    options: {\n      plugins: {\n        legend: {\n          display: false\n        },\n        tooltip: {\n          boxPadding: 3\n        }\n      }\n    }',"    options: {\n      color: () => getComputedStyle(ctx).color,\n      borderColor: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`,\n      plugins: {\n        legend: {\n          display: false\n        },\n        tooltip: {\n          backgroundColor: 'rgba(55, 50, 52, 0.8)',\n          boxPadding: 3\n        }\n      }\n    }"],
 ['  })\n})()',"  })\n\n  new MutationObserver(() => {\n    chart.update('none')\n    chart.draw()\n  }).observe(document.documentElement, {\n    attributes: true,\n    attributeFilter: ['data-bs-theme']\n  })\n})()"]
]);
const chartOptionsFrom=[...chartPaintPairs.keys()].find(value=>value.startsWith('    options:'));
const chartAxisPaint="          ticks: {\n            color: () => getComputedStyle(ctx).color\n          },\n          grid: {\n            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`\n          },\n          border: {\n            color: () => `rgba(${getComputedStyle(ctx).getPropertyValue('--bs-body-color-rgb')}, 0.1)`\n          }";
chartPaintPairs.set(chartOptionsFrom,chartPaintPairs.get(chartOptionsFrom).replace('\n      plugins: {','\n      scales: {\n        x: {\n'+chartAxisPaint+'\n        },\n        y: {\n'+chartAxisPaint+'\n        }\n      },\n      plugins: {'));
const chartFiles=new Set(['site/src/assets/examples/dashboard/dashboard.js','site/src/assets/examples/dashboard-rtl/dashboard.js']);
const coverAlphaFrom='  color: rgba(255, 255, 255, .5);';
const coverAlphaTo='  color: rgba(255, 255, 255, .55);';
const coverRuleFrom='.nav-masthead .active {\n  color: #fff;\n  border-bottom-color: #fff;\n}\n';
const coverRuleTo=coverRuleFrom+'\n.cover-container footer.text-white-50 {\n  color: rgba(255, 255, 255, .55) !important;\n}\n';
const navbarPaintRule='.navbar-dark .btn-outline-success {\n  --bs-btn-color: #fff;\n  --bs-btn-border-color: #fff;\n  --bs-btn-hover-color: #373234;\n  --bs-btn-hover-bg: #fff;\n  --bs-btn-hover-border-color: #fff;\n  --bs-btn-active-color: #373234;\n  --bs-btn-active-bg: #fff;\n  --bs-btn-active-border-color: #fff;\n  --bs-btn-disabled-color: #fff;\n  --bs-btn-disabled-border-color: #fff;\n  --bs-btn-focus-shadow-rgb: 255, 255, 255;\n}\n';
const carouselRulePrefix='@media (min-width: 62em) {\n  .featurette-heading {\n    margin-top: 7rem;\n  }\n}\n';
const navbarRulePrefixes=new Map([
 ['site/src/assets/examples/carousel/carousel.css',carouselRulePrefix],
 ['site/src/assets/examples/carousel/carousel.rtl.css',carouselRulePrefix],
 ['site/src/assets/examples/offcanvas-navbar/offcanvas-navbar.css','.bg-purple {\n  background-color: #e31b23;\n}\n']
]);
// Compare every unchanged character after masking solely literal colour tokens.
// Explicit alpha channels remain part of the comparison. The two original
// placeholder paint-expression slots are the complete, narrow exception list.
export function verifySubstitutions(original,actual,fileRecord){
 original=String(original);actual=String(actual);const findings=[],checks=[];let reconstructed=original;
 if(!fileRecord||!Array.isArray(fileRecord.substitutions))return {pass:false,findings:[{type:'invalid-substitution-record'}]};
 for(const [index,s]of fileRecord.substitutions.entries()){
  if(typeof s.from!=='string'||!s.from||typeof s.to!=='string'||!Number.isSafeInteger(s.count)||s.count<1){findings.push({type:'invalid-substitution',index});continue;}
  const count=reconstructed.split(s.from).length-1;let permitted=false;
  if(s.kind==='paint-expression')permitted=fileRecord.path==='site/src/libs/placeholder.ts'&&paintExpressionPairs.get(s.from)===s.to&&s.count===1;
  else if(s.kind==='contrast-paint-alpha')permitted=fileRecord.path==='site/src/assets/examples/cover/cover.css'&&s.from===coverAlphaFrom&&s.to===coverAlphaTo&&s.count===1;
  else if(s.kind==='contrast-paint-rule')permitted=s.count===1&&(fileRecord.path==='site/src/assets/examples/cover/cover.css'&&s.from===coverRuleFrom&&s.to===coverRuleTo||navbarRulePrefixes.get(fileRecord.path)===s.from&&s.to===s.from+'\n'+navbarPaintRule);
  else if(['chart-paint-options','chart-theme-paint-redraw'].includes(s.kind))permitted=chartFiles.has(fileRecord.path)&&chartPaintPairs.get(s.from)===s.to&&s.count===1;
  else if(s.kind==='paint-alias'){
   permitted=paintAliases.get(fileRecord.path)?.get(s.from)===s.to&&s.count===1;
   if(['site/src/content/docs/components/carousel.mdx','site/src/assets/examples/cheatsheet/index.astro','site/src/assets/examples/cheatsheet-rtl/index.astro','site/src/assets/examples/carousel/index.astro','site/src/assets/examples/carousel-rtl/index.astro'].includes(fileRecord.path)){
    const variables=[...s.to.matchAll(/var\(([^)]+)\)/g)].map(m=>m[1]);
    const sourceVariables=[...s.from.matchAll(/var\(([^)]+)\)/g)].map(m=>m[1]);
    permitted=sourceVariables.every(v=>['--bs-secondary-color','--bs-body-color','--bs-emphasis-color','--bs-body-bg'].includes(v))&&variables.length>0&&variables.every(v=>['--bs-secondary-color','--bs-body-color','--bs-emphasis-color','--bs-body-bg'].includes(v))&&maskLiteralPaint(s.from)===maskLiteralPaint(s.to);
   }
  }
  else {const fragment=value=>/^rgba?\([\d.]+,\s*[\d.]+,\s*[\d.]+,$/i.test(value)?'<paint-rgb-prefix>':maskLiteralPaint(value);permitted=!/var\(/.test(s.to)&&fragment(s.from)===fragment(s.to)&&s.from!==s.to&&fragment(s.from)!==s.from;}
  if(!permitted)findings.push({type:'non-colour-or-alpha-change',index,from:s.from,to:s.to});
  if(count!==s.count)findings.push({type:'occurrence-count',index,expected:s.count,actual:count});
  reconstructed=reconstructed.split(s.from).join(s.to);checks.push({index,count,expected:s.count,paintOnly:permitted,kind:s.kind||'literal-paint'});
 }
 if(reconstructed!==actual)findings.push({type:'unmanifested-source-change',reconstructedSHA256:sha(reconstructed),actualSHA256:sha(actual)});
 let maskedOriginal=original;for(const [from,to]of paintExpressionPairs)if(fileRecord.path==='site/src/libs/placeholder.ts')maskedOriginal=maskedOriginal.split(from).join(to);
 if(fileRecord.path==='site/src/assets/examples/cover/cover.css')maskedOriginal=maskedOriginal.split(coverAlphaFrom).join(coverAlphaTo);
 let maskedActual=actual;if(fileRecord.path==='site/src/assets/examples/cover/cover.css')maskedActual=maskedActual.split(coverRuleTo).join(coverRuleFrom);if(navbarRulePrefixes.has(fileRecord.path)){const prefix=navbarRulePrefixes.get(fileRecord.path);maskedActual=maskedActual.split(prefix+'\n'+navbarPaintRule).join(prefix);}if(chartFiles.has(fileRecord.path))for(const [from,to]of chartPaintPairs)maskedActual=maskedActual.split(to).join(from);
 if(maskLiteralPaint(maskedOriginal)!==maskLiteralPaint(maskedActual))findings.push({type:'whole-source-non-colour-or-alpha-change'});
 return {pass:findings.length===0,originalSHA256:sha(original),actualSHA256:sha(actual),reconstructedSHA256:sha(reconstructed),checks,findings};
}
