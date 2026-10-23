import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import rtlcss from 'rtlcss';
import * as esbuild from 'esbuild';
import {accessibleSource,accessibleOverlay,forcedSource,forcedOverlay,utilitySource,utilityOverlay,utilityEntry} from './remediation/approved-paint-literals.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'package.json'));
const {parseDocument}=require('htmlparser2');
const CleanCSS=require('clean-css');
const out=path.join(root,'qa/results');
const baseline=process.argv.includes('--baseline');
const actualDir=path.join(root,baseline?'qa/baselines/pre-colour-only/dist/css':'dist/css');
const references=path.join(root,'qa/reference-native/css');
const hash=value=>createHash('sha256').update(value).digest('hex');
const families=['bootstrap','bootstrap-grid','bootstrap-reboot','bootstrap-utilities'];
const colourFunctions=new Set(['rgb','rgba','hsl','hsla','hwb','lab','lch','oklab','oklch','color','color-mix','light-dark','device-cmyk']);
const colourWords=new Set(['transparent','currentcolor','black','white']);
const paintAttrs=new Set(['fill','stroke','color','stop-color','flood-color','lighting-color']);
const semanticPaintProperties=new Set();
const purePaint=/^(?:color|background-color|border(?:-(?:top|right|bottom|left|block(?:-start|-end)?|inline(?:-start|-end)?))?-color|outline-color|text-decoration-color|text-emphasis-color|column-rule-color|caret-color|accent-color|fill|stroke|stop-color|flood-color|lighting-color)$/;
const escapeXML=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function canonicalSVG(svg){
 const document=parseDocument(svg,{xmlMode:true,decodeEntities:true});
 const serial=node=>{
  if(node.type==='text')return node.data.trim()?node.data:'';
  if(node.type==='comment'||node.type==='directive')return '';
  if(!node.name)return (node.children||[]).map(serial).join('');
  const attrs=Object.entries(node.attribs||{}).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>{
   if(paintAttrs.has(name))value='#010203';
   else if(name==='style'){const ast=postcss.parse(`a{${value}}`);ast.walkDecls(d=>d.value=maskValue(d.value,d.prop));value=ast.first.nodes.map(d=>`${d.prop}:${d.value}${d.important?'!important':''}`).join(';');}
   return `${name}="${escapeXML(value)}"`;
  }).join(' ');
  return `<${node.name}${attrs?' '+attrs:''}>${(node.children||[]).map(serial).join('')}</${node.name}>`;
 };
 return document.children.map(serial).join('');
}
function closing(value,start){let depth=1,quote='';for(let i=start+1;i<value.length;i++){const c=value[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'")quote=c;else if(c==='(')depth++;else if(c===')'&&!--depth)return i;}throw Error('Unbalanced CSS value: '+value);}
function unquote(value){value=value.trim();if((value[0]==='"'||value[0]==="'")&&value.at(-1)===value[0])value=value.slice(1,-1);return value.replace(/\\([\\"'])/g,'$1');}
function shadowPaintAlias(value,property){
 if(!/^(?:box-shadow|text-shadow|--[\w-]*shadow)$/.test(property))return value;
 let depth=0,quote='',start=0;const layers=[];
 for(let i=0;i<=value.length;i++){const c=value[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'")quote=c;else if(c==='(')depth++;else if(c===')')depth--;else if((c===','&&depth===0)||i===value.length){layers.push(value.slice(start,i));start=i+1;}}
 return layers.map(layer=>{const match=layer.match(/^(.*?)(\s+)var\((?:--bs-body-color|--tq-focus-ring-colour,\s*var\(--bs-body-color\))\)(\s*)$/);if(!match)return layer;const geometry=match[1].trim().split(/\s+/).filter(Boolean),lengths=geometry.filter(token=>token!=='inset');const max=property==='text-shadow'?3:4;
  // A semantic colour alias is allowed only after a complete numeric shadow
  // geometry. It can never replace an offset, blur, spread or unknown variable.
  if(geometry.filter(token=>token==='inset').length>1||lengths.length<2||lengths.length>max||!lengths.every(token=>/^[+-]?(?:\d*\.)?\d+(?:[a-z%]+)?$/i.test(token)))return layer;
  return match[1]+match[2]+'#010203'+match[3];
 }).join(',');
}
function maskValue(value,property=''){
 value=shadowPaintAlias(value,property);
 // These two exact native border-colour aliases occupy only the final paint
 // slot after Bootstrap's unchanged width variable and solid border style.
 // Unknown variables, numeric widths, styles and other slots remain strict.
 if(property==='border')value=value.replace(/^var\(--bs-border-width\) solid var\(--bs-(?:border-color|secondary-color)\)$/, 'var(--bs-border-width) solid #010203');
 // Only the explicitly approved default focus alpha differs from native.
 // Every other opacity property/value remains subject to strict comparison.
 if(property==='--bs-focus-ring-opacity'&&/^(?:0?\.25|1)$/.test(value.trim()))return '#approved-default-focus-alpha';
 const imagePaint=/\b(?:url|(?:repeating-)?(?:linear|radial|conic)-gradient)\(/i.test(value);
 // Colour-bearing custom properties can alias another semantic colour token.
 // Image/gradient variables are always traversed instead, preserving geometry.
 if(!imagePaint&&(purePaint.test(property)||(property.startsWith('--')&&/-(?:color|bg)$/.test(property)))){if(property.startsWith('--'))semanticPaintProperties.add(property);return '#010203';}
 if(property.startsWith('--')&&property.endsWith('-rgb')&&/^\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*$/.test(value))return '1,2,3';
 let output='';
 for(let i=0;i<value.length;){
  const c=value[i];
  if(c==='"'||c==="'"){let end=i+1;for(;end<value.length;end++){if(value[end]==='\\')end++;else if(value[end]===c){end++;break;}}output+=value.slice(i,end);i=end;continue;}
  if(c==='#'){const found=value.slice(i).match(/^#[a-f\d]{3,8}(?![a-f\d])/i);if(found&&[4,5,7,9].includes(found[0].length)){output+='#010203';i+=found[0].length;continue;}}
  const word=value.slice(i).match(/^(?:--)?[a-z_][a-z\d_-]*/i);
  if(word){const name=word[0],end=i+name.length;if(value[end]==='('){const finish=closing(value,end);const argument=value.slice(end+1,finish);const lower=name.toLowerCase();if(colourFunctions.has(lower))output+='#010203';else if(lower==='url'){
    const url=unquote(argument);if(/^data:image\/svg\+xml,/i.test(url)){const decoded=decodeURIComponent(url.slice(url.indexOf(',')+1));output+=`url("data:image/svg+xml,${encodeURIComponent(canonicalSVG(decoded))}")`;}else output+=value.slice(i,finish+1);
   }else output+=name+'('+maskValue(argument)+')';i=finish+1;continue;}
   output+=colourWords.has(name.toLowerCase())?'#010203':name;i=end;continue;
  }
  output+=c;i++;
 }
 return output.trim().replace(/\s+/g,' ');
}
function maskCSS(css){const ast=postcss.parse(css);ast.walkComments(c=>c.remove());ast.walkDecls(d=>d.value=maskValue(d.value,d.prop));return ast;}
function model(ast){const records=[],rules=[],svg=[];function visit(container,context=[]){for(const n of container.nodes||[]){if(n.type==='atrule'){const key='@'+n.name+' '+(n.params||'').trim().replace(/\s+/g,' ');records.push({kind:'at-rule',context,key,hasBlock:Boolean(n.nodes)});if(n.nodes)visit(n,[...context,key]);}else if(n.type==='rule'){const selector=n.selector.trim().replace(/\s+/g,' ');const decls=[];for(const d of n.nodes||[]){if(d.type==='decl'){decls.push({property:d.prop,value:d.value,important:Boolean(d.important)});if(d.value.includes('data:image/svg+xml,'))svg.push({context,selector,property:d.prop,geometrySHA256:hash(d.value),value:d.value});}else if(d.type!=='comment')throw Error('Unexpected CSS node in rule '+d.type);}records.push({kind:'rule',context,selector,declarations:decls});rules.push({context,selector,declarations:decls});}else if(n.type==='decl')records.push({kind:'decl',context,property:n.prop,value:n.value,important:Boolean(n.important)});else if(n.type!=='comment')throw Error('Unexpected CSS node '+n.type);}}visit(ast);return {records,rules,svg};}
function differences(expected,actual){
 const key=r=>JSON.stringify([r.kind,r.context,r.selector??r.key??r.property]);const groups=items=>{const map=new Map();for(const r of items){const k=key(r),a=map.get(k)||[];a.push(r);map.set(k,a);}return map;};const e=groups(expected.records),a=groups(actual.records);const findings=[];
 for(const k of new Set([...e.keys(),...a.keys()])){const er=e.get(k)||[],ar=a.get(k)||[];for(let i=0;i<Math.max(er.length,ar.length);i++){const x=er[i],y=ar[i];if(!x){findings.push({type:'extra-rule-or-at-rule',actual:y});continue;}if(!y){findings.push({type:'missing-rule-or-at-rule',expected:x});continue;}if(JSON.stringify(x)===JSON.stringify(y))continue;if(x.kind!=='rule'){findings.push({type:'changed-at-rule-or-declaration',expected:x,actual:y});continue;}
   const byProp=ds=>{const m=new Map();for(const d of ds){const v=m.get(d.property)||[];v.push(d);m.set(d.property,v);}return m;};const ed=byProp(x.declarations),ad=byProp(y.declarations);for(const p of new Set([...ed.keys(),...ad.keys()])){const ev=ed.get(p)||[],av=ad.get(p)||[];if(JSON.stringify(ev)!==JSON.stringify(av))findings.push({type:'changed-declaration',context:x.context,selector:x.selector,property:p,expected:ev,actual:av});}
   if(JSON.stringify(x.declarations.map(d=>d.property))!==JSON.stringify(y.declarations.map(d=>d.property)))findings.push({type:'declaration-order-or-surface',context:x.context,selector:x.selector,expected:x.declarations.map(d=>d.property),actual:y.declarations.map(d=>d.property)});
  }}
 if(JSON.stringify(expected.records.map(key))!==JSON.stringify(actual.records.map(key)))findings.push({type:'rule-order-or-surface',expectedCount:expected.records.length,actualCount:actual.records.length});
 return findings;
}
const validationGroups=[
 {role:'success',selectors:['.was-validated .form-check-input:valid:checked','.form-check-input.is-valid:checked'],minifiedSelectors:['.form-check-input.is-valid:checked','.was-validated .form-check-input:valid:checked']},
 {role:'danger',selectors:['.was-validated .form-check-input:invalid:checked','.form-check-input.is-invalid:checked'],minifiedSelectors:['.form-check-input.is-invalid:checked','.was-validated .form-check-input:invalid:checked']}
];
const validationSelectors=validationGroups.flatMap(group=>group.selectors);
const validationOverlay=validationGroups.map(group=>group.selectors.join(',\n')+' {\n  background-color: var(--bs-'+group.role+');\n}\n').join('');
const validationMinifiedOverlay=validationGroups.map(group=>group.minifiedSelectors.join(',')+'{background-color:var(--bs-'+group.role+')}').join('');
const validationSource="// Keep Bootstrap's original white checked glyph on the matching semantic paint.\n// Only paint changes; native selectors, glyphs, dimensions and behaviour remain.\n"+validationGroups.map(group=>group.selectors.join(',\n')+' {\n  background-color: var(--#{$prefix}'+group.role+');\n}\n').join('');
const validationEntry='// Colour substitutions only; component rules are Bootstrap\'s original source.\n@import "bootstrap/scss/functions";\n@import "tokens";\n@import "validation-focus-colours";\n@import "bootstrap/scss/bootstrap";\n@import "validation-colours";\n';
const accessibleMinifiedOverlay=new CleanCSS({level:1}).minify(accessibleOverlay).styles;
const utilityMinifiedOverlay=new CleanCSS({level:1}).minify(utilityOverlay).styles;
const verifyUtilitySource=(source,entry)=>source===utilitySource&&entry===utilityEntry;
const accessibleEntry=validationEntry+'@import "accessible-colours";\n@import "forced-colours";\n';
const verifyAccessibleSource=(source,entry)=>source===accessibleSource&&entry===accessibleEntry;
const forcedMinifiedOverlay=new CleanCSS({level:1}).minify(forcedOverlay).styles;
const forcedOverlayFor=(direction='ltr',minified=false)=>{const expanded=direction==='rtl'?rtlcss.process(forcedOverlay):forcedOverlay;return minified?new CleanCSS({level:1}).minify(expanded).styles:expanded;};
const verifyForcedSource=source=>source===forcedSource;
function verifyForcedOverlay(css,required=true,minified=false,withUtilityOverlay=false,direction='ltr'){
 const ast=postcss.parse(css),nodes=ast.nodes.filter(n=>n.type!=='comment'),matches=[];
 ast.walkAtRules('media',rule=>{if(/forced-colors/.test(rule.params))matches.push(rule);});
 if(!required){
  if(!withUtilityOverlay)return {pass:matches.length===0,required:false,occurrences:matches.length};
  const expectedBlock=postcss.parse(minified?utilityMinifiedOverlay:utilityOverlay).nodes.filter(n=>n.type==='atrule'&&n.name==='media'&&/forced-colors/.test(n.params));
  const pass=matches.length===1&&expectedBlock.length===1&&matches[0].parent===ast&&matches[0]===nodes.at(-1)&&JSON.stringify(model(postcss.parse(matches[0].toString())).records)===JSON.stringify(model(postcss.parse(expectedBlock[0].toString())).records);
  return {pass,required:false,utilityHelperRequired:true,occurrences:matches.length};
 }

 const expected=model(postcss.parse(forcedOverlayFor(direction,minified)));
 const rules=matches.map(rule=>({root:rule.parent===ast,params:rule.params,records:model(postcss.parse(rule.toString())).records,pass:rule.parent===ast&&JSON.stringify(model(postcss.parse(rule.toString())).records)===JSON.stringify(expected.records)}));
 const rootFinalRule=matches.length===1&&matches[0]===nodes.at(-1);
 return{pass:rootFinalRule&&rules.every(r=>r.pass),required:true,occurrences:matches.length,rootFinalRule,rules};
}
function verifyAccessibleOverlay(css,required=true,minified=false,withForcedOverlay=false,direction='ltr'){
 const ast=postcss.parse(css),nodes=ast.nodes.filter(n=>n.type!=='comment');
 const expected=postcss.parse(minified?accessibleMinifiedOverlay:accessibleOverlay).nodes.filter(n=>n.type!=='comment');
 const trailing=withForcedOverlay?1:0;
 const actual=nodes.slice(-expected.length-trailing,trailing?-trailing:undefined);
 const serial=n=>model(postcss.parse(n.toString())).records;
 const rules=actual.map((rule,index)=>({index,root:rule.parent===ast,selector:rule.selector,pass:JSON.stringify(serial(rule))===JSON.stringify(serial(expected[index]))}));
 const signatures=[];ast.walkDecls(d=>{if(d.prop.startsWith('--tq-')&&d.parent?.parent===ast)signatures.push([d.prop,d.value,Boolean(d.important)]);});
 const expectedSignatures=[];postcss.parse(minified?accessibleMinifiedOverlay:accessibleOverlay).walkDecls(d=>{if(d.prop.startsWith('--tq-'))expectedSignatures.push([d.prop,d.value,Boolean(d.important)]);});
 if(!required){const matches=[];ast.walkRules(r=>{if(r.selector.includes('.navbar .btn-outline-primary')&&r.nodes.some(d=>d.prop==='--bs-btn-color'&&d.value==='var(--bs-navbar-color)'))matches.push(r);});return {pass:matches.length===0,required:false,occurrences:matches.length};}
 const forcedProof=withForcedOverlay?verifyForcedOverlay(css,true,minified,false,direction):null;
 const rootFinalRules=actual.length===expected.length&&JSON.stringify(signatures)===JSON.stringify(expectedSignatures)&&rules.every(r=>r.root&&r.pass)&&(!forcedProof||forcedProof.pass);
 return {pass:rootFinalRules,required:true,occurrences:actual.length,rootFinalRules,rules};
}
function verifyUtilityOverlay(css,required=true,minified=false){
 const ast=postcss.parse(css),nodes=ast.nodes.filter(n=>n.type!=='comment');
 const expected=postcss.parse(minified?utilityMinifiedOverlay:utilityOverlay).nodes.filter(n=>n.type!=='comment');
 if(!required){const matches=[];ast.walkRules(r=>{if(r.selector==='.bg-body'&&r.nodes.some(d=>d.prop==='--tq-focus-ring-colour'))matches.push(r);});return {pass:matches.length===0,required:false,occurrences:matches.length};}
 const actual=nodes.slice(-expected.length);
 const serial=n=>model(postcss.parse(n.toString())).records;
 const rules=actual.map((r,i)=>({index:i,root:r.parent===ast,selector:r.selector,pass:JSON.stringify(serial(r))===JSON.stringify(serial(expected[i]))}));
 const signatures=[],expectedSignatures=[];ast.walkDecls(d=>{if(d.prop.startsWith('--tq-'))signatures.push([d.prop,d.value,Boolean(d.important)]);});postcss.parse(minified?utilityMinifiedOverlay:utilityOverlay).walkDecls(d=>{if(d.prop.startsWith('--tq-'))expectedSignatures.push([d.prop,d.value,Boolean(d.important)]);});
 const rootFinalRules=actual.length===expected.length&&rules.every(r=>r.root&&r.pass)&&JSON.stringify(signatures)===JSON.stringify(expectedSignatures);
 return {pass:rootFinalRules,required:true,occurrences:actual.length,rootFinalRules,rules};
}
function verifyValidationOverlay(css,required=true,minified=false,withAccessibleOverlay=false,withForcedOverlay=false,direction='ltr'){
 const ast=postcss.parse(css),nodes=ast.nodes.filter(node=>node.type!=='comment'),matches=[];
 ast.walkRules(rule=>{const selectors=postcss.list.comma(rule.selector).map(value=>value.trim().replace(/\s+/g,' '));const group=validationGroups.find(group=>{const expected=minified?group.minifiedSelectors:group.selectors;return selectors.length===expected.length&&selectors.every((value,index)=>value===expected[index]);});
  // Native validation rules use form-valid/invalid-color in these same selector
  // contexts. Only the enumerated semantic-role overlay paint is identified here.
  if(group&&rule.nodes.some(node=>node.type==='decl'&&node.prop==='background-color'&&/^var\(--bs-(?:success|danger)\)$/.test(node.value)))matches.push({rule,group});
 });
 if(!required)return {pass:matches.length===0,required:false,occurrences:matches.length};
 const rules=matches.map(({rule,group})=>{const declarations=rule.nodes.filter(node=>node.type!=='comment');return {role:group.role,selectors:postcss.list.comma(rule.selector),root:rule.parent===ast,declarations:declarations.map(node=>({type:node.type,property:node.prop,value:node.value,important:Boolean(node.important)})),pass:declarations.length===1&&declarations[0].type==='decl'&&declarations[0].prop==='background-color'&&declarations[0].value==='var(--bs-'+group.role+')'&&!declarations[0].important};});
 const trailingRules=(withAccessibleOverlay?postcss.parse(minified?accessibleMinifiedOverlay:accessibleOverlay).nodes.filter(n=>n.type!=='comment').length:0)+(withForcedOverlay?1:0);
 const accessibilityProof=withAccessibleOverlay?verifyAccessibleOverlay(css,true,minified,withForcedOverlay,direction):null;
 const rootFinalRule=matches.length===2&&matches.every(({rule},index)=>rule.parent===ast&&nodes.at(-2-trailingRules+index)===rule)&&(!accessibilityProof||accessibilityProof.pass);
 const pass=rootFinalRule&&rules.every((rule,index)=>rule.pass&&rule.role===validationGroups[index].role);
 return {pass,required:true,occurrences:matches.length,rootFinalRule,immediatelyBeforeAccessibleOverlay:withAccessibleOverlay,accessibilityProof,selectors:rules.flatMap(rule=>rule.selectors),rules};
}
function verifyDefaultFocusAlpha(css,required=true){
 const ast=postcss.parse(css),values=[];
 ast.walkDecls('--bs-focus-ring-opacity',d=>values.push({value:d.value,important:Boolean(d.important),root:d.parent?.parent===ast,selector:d.parent?.selector}));
 const expected=[':root','[data-bs-theme=light]'];
 const pass=required?values.length===1&&values[0].value==='1'&&!values[0].important&&values[0].root&&JSON.stringify(postcss.list.comma(values[0].selector).map(v=>v.trim().replaceAll('"','')))==JSON.stringify(expected):values.length===0;
 return {pass,required,values};
}
function paintBoundaryProbes(){
 const result=[],probe=(name,pass)=>result.push({name,pass});
 const nativeBorder='var(--bs-border-width) solid var(--bs-border-color)',strongBorder='var(--bs-border-width) solid var(--bs-secondary-color)';
 probe('known-final-form-border-paint-alias-accepted',maskValue(nativeBorder,'border')===maskValue(strongBorder,'border'));
 probe('form-border-unknown-width-alias-rejected',maskValue(nativeBorder,'border')!==maskValue(strongBorder.replace('--bs-border-width','--unknown-width'),'border'));
 probe('form-border-numeric-width-change-rejected',maskValue(nativeBorder,'border')!==maskValue(strongBorder.replace('var(--bs-border-width)','2px'),'border'));
 probe('form-border-style-change-rejected',maskValue(nativeBorder,'border')!==maskValue(strongBorder.replace(' solid ',' dashed '),'border'));
 probe('form-border-paint-alias-in-width-slot-rejected',maskValue(nativeBorder,'border')!==maskValue('var(--bs-secondary-color) solid var(--bs-border-color)','border'));
 probe('form-border-unknown-paint-alias-rejected',maskValue(nativeBorder,'border')!==maskValue(strongBorder.replace('--bs-secondary-color','--unknown-color'),'border'));
 probe('form-border-alias-in-other-property-rejected',maskValue(nativeBorder,'transform')!==maskValue(strongBorder,'transform'));
 const shadow='0 0 0 0.25rem rgba(13, 110, 253, 0.25)',alias='0 0 0 0.25rem var(--bs-body-color)';
 probe('known-final-shadow-paint-alias',maskValue(shadow,'box-shadow')===maskValue(alias,'box-shadow'));
 probe('known-final-custom-shadow-paint-alias',maskValue(shadow,'--bs-btn-close-focus-shadow')===maskValue(alias,'--bs-btn-close-focus-shadow'));
 probe('unknown-shadow-variable-rejected',maskValue(shadow,'box-shadow')!==maskValue(alias.replace('--bs-body-color','--unknown'),'box-shadow'));
 probe('paint-alias-as-shadow-dimension-rejected',maskValue(shadow,'box-shadow')!==maskValue('0 0 var(--bs-body-color) 0.25rem #fff','box-shadow'));
 probe('changed-shadow-blur-rejected',maskValue(shadow,'box-shadow')!==maskValue('0 0 1px 0.25rem var(--bs-body-color)','box-shadow'));
 probe('changed-shadow-spread-rejected',maskValue(shadow,'box-shadow')!==maskValue('0 0 0 0.5rem var(--bs-body-color)','box-shadow'));
 probe('paint-alias-in-nonpaint-property-rejected',maskValue('0 0 0 0.25rem #fff','transform')!==maskValue(alias,'transform'));
 probe('exact-validation-overlay-accepted',verifyValidationOverlay(validationOverlay).pass);
 probe('minified-validation-overlay-accepted',new CleanCSS({level:1}).minify(validationOverlay).styles===validationMinifiedOverlay&&verifyValidationOverlay(validationMinifiedOverlay,true,true).pass);
 probe('overlay-geometry-declaration-rejected',!verifyValidationOverlay(validationOverlay.replace('background-color:','border-radius: 2px;\n  background-color:')).pass);
 probe('overlay-unknown-paint-alias-rejected',!verifyValidationOverlay(validationOverlay.replace('--bs-success','--unknown')).pass);
 probe('overlay-changed-selector-rejected',!verifyValidationOverlay(validationOverlay.replace(':valid:checked',':valid')).pass);
 probe('overlay-important-rejected',!verifyValidationOverlay(validationOverlay.replace('var(--bs-success);','var(--bs-success) !important;')).pass);
 probe('overlay-duplicate-rejected',!verifyValidationOverlay(validationOverlay+validationOverlay).pass);
 probe('overlay-nested-context-rejected',!verifyValidationOverlay('@media (min-width: 1px){'+validationOverlay+'}').pass);
 probe('overlay-nonfinal-rule-rejected',!verifyValidationOverlay(validationOverlay+'a{color:red}').pass);
 probe('overlay-absent-in-other-family-accepted',verifyValidationOverlay('a{color:red}',false).pass);
 probe('overlay-present-in-other-family-rejected',!verifyValidationOverlay(validationOverlay,false).pass);
 probe('overlay-swapped-semantic-roles-rejected',!verifyValidationOverlay(validationOverlay.replace('--bs-success','--temporary').replace('--bs-danger','--bs-success').replace('--temporary','--bs-danger')).pass);
 probe('overlay-missing-semantic-role-rejected',!verifyValidationOverlay(validationOverlay.slice(0,validationOverlay.indexOf('}\n')+2)).pass);
 probe('exact-accessible-paint-overlay-accepted',verifyAccessibleOverlay(accessibleOverlay).pass);
 probe('minified-accessible-paint-overlay-accepted',verifyAccessibleOverlay(accessibleMinifiedOverlay,true,true).pass);
 probe('accessible-overlay-extra-geometry-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--bs-btn-color:','border-radius:2px;--bs-btn-color:')).pass);
 probe('accessible-overlay-unknown-property-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--bs-btn-color:','--unknown:')).pass);
 probe('accessible-overlay-unknown-selector-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('.navbar .btn-outline-light','.unknown')).pass);
 probe('accessible-overlay-altered-context-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('.bg-dark.text-secondary','.bg-light.text-secondary')).pass);
 probe('accessible-overlay-unknown-ink-alias-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('var(--bs-navbar-color)','var(--unknown)')).pass);
 probe('accessible-overlay-duplicate-rejected',!verifyAccessibleOverlay(accessibleOverlay+accessibleOverlay).pass);
 probe('accessible-overlay-nested-context-rejected',!verifyAccessibleOverlay('@media (min-width:1px){'+accessibleOverlay+'}').pass);
 probe('accessible-overlay-nonfinal-rule-rejected',!verifyAccessibleOverlay(accessibleOverlay+'a{color:red}').pass);
 probe('accessible-overlay-present-in-other-family-rejected',!verifyAccessibleOverlay(accessibleOverlay,false).pass);
 probe('validation-immediately-before-accessible-overlay-accepted',verifyValidationOverlay(validationOverlay+accessibleOverlay,true,false,true).pass);
 probe('validation-extra-trailing-rule-before-accessible-overlay-rejected',!verifyValidationOverlay(validationOverlay+'a{color:red}'+accessibleOverlay,true,false,true).pass);
 probe('accessible-source-unknown-selector-rejected',!verifyAccessibleSource(accessibleSource.replace('.navbar .btn-outline-light','.unknown'),accessibleEntry));
 probe('accessible-source-extra-geometry-rejected',!verifyAccessibleSource(accessibleSource.replace('  color:', '  padding: 1px;\n  color:'),accessibleEntry));
 probe('accessible-source-unapproved-entry-import-rejected',!verifyAccessibleSource(accessibleSource,accessibleEntry+'@import "unknown";\n'));
 probe('exact-forced-accessibility-overlay-accepted',verifyForcedOverlay(forcedOverlay).pass);
 probe('minified-forced-accessibility-overlay-accepted',verifyForcedOverlay(forcedMinifiedOverlay,true,true).pass);
 probe('forced-source-unknown-selector-rejected',!verifyForcedSource(forcedSource.replace('.btn:focus-visible','.unknown:focus-visible')));
 probe('forced-overlay-normal-media-rejected',!verifyForcedOverlay(forcedOverlay.replace('(forced-colors: active)','(min-width: 1px)')).pass);
 probe('forced-overlay-unknown-selector-rejected',!verifyForcedOverlay(forcedOverlay.replace('.btn:focus-visible','.unknown:focus-visible')).pass);
 probe('forced-overlay-unknown-property-rejected',!verifyForcedOverlay(forcedOverlay.replace('outline:','padding:1px;outline:')).pass);
 probe('forced-overlay-outline-width-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('2px solid','3px solid')).pass);
 probe('forced-overlay-outline-offset-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('outline-offset: 2px','outline-offset: 3px')).pass);
 probe('forced-overlay-unknown-outline-paint-rejected',!verifyForcedOverlay(forcedOverlay.replace('CanvasText','Highlight')).pass);
 probe('forced-overlay-appearance-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('appearance: auto','appearance: none')).pass);
 probe('forced-overlay-glyph-image-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('background-image: none','background-image: url(x)')).pass);
 probe('forced-overlay-nested-media-rejected',!verifyForcedOverlay('@media(min-width:1px){'+forcedOverlay+'}').pass);
 probe('forced-overlay-duplicate-rejected',!verifyForcedOverlay(forcedOverlay+forcedOverlay).pass);
 probe('forced-overlay-nonfinal-rule-rejected',!verifyForcedOverlay(forcedOverlay+'a{color:red}').pass);
 probe('forced-overlay-present-in-other-family-rejected',!verifyForcedOverlay(forcedOverlay,false).pass);
 probe('forced-range-track-unknown-selector-rejected',!verifyForcedOverlay(forcedOverlay.replace('::-moz-range-track','::-moz-range-progress')).pass);
 probe('forced-range-thumb-border-width-rejected',!verifyForcedOverlay(forcedOverlay.replace('1px solid CanvasText','2px solid CanvasText')).pass);
 probe('forced-range-thumb-extra-geometry-rejected',!verifyForcedOverlay(forcedOverlay.replace('background-color: Canvas;','width:2rem;background-color: Canvas;')).pass);
 probe('forced-source-range-border-change-rejected',!verifyForcedSource(forcedSource.replace('1px solid CanvasText','2px solid CanvasText')));
 probe('contextual-final-shadow-paint-alias-accepted',maskValue(shadow,'box-shadow')===maskValue('0 0 0 0.25rem var(--tq-focus-ring-colour, var(--bs-body-color))','box-shadow'));
 probe('contextual-shadow-unknown-fallback-rejected',maskValue(shadow,'box-shadow')!==maskValue('0 0 0 0.25rem var(--tq-focus-ring-colour, var(--unknown))','box-shadow'));
 probe('contextual-shadow-alias-in-dimension-rejected',maskValue(shadow,'box-shadow')!==maskValue('0 0 var(--tq-focus-ring-colour, var(--bs-body-color)) 0.25rem #fff','box-shadow'));
 probe('known-focus-default-alpha-accepted',maskValue('.25','--bs-focus-ring-opacity')===maskValue('1','--bs-focus-ring-opacity'));
 probe('unapproved-focus-default-alpha-rejected',maskValue('.25','--bs-focus-ring-opacity')!==maskValue('.5','--bs-focus-ring-opacity'));
 probe('ordinary-opacity-remains-strict',maskValue('.25','opacity')!==maskValue('1','opacity'));
 probe('unknown-opacity-variable-remains-strict',maskValue('.25','--unknown-opacity')!==maskValue('1','--unknown-opacity'));
 probe('outline-mode-unknown-token-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--tq-mode-outline-primary:', '--tq-unknown:')).pass);
 probe('focus-role-alpha-api-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('var(--bs-focus-ring-opacity)', '1')).pass);
 probe('focus-default-one-required',verifyDefaultFocusAlpha(':root,[data-bs-theme=light]{--bs-focus-ring-opacity:1}').pass);
 probe('native-translucent-default-rejected',!verifyDefaultFocusAlpha(':root,[data-bs-theme=light]{--bs-focus-ring-opacity:.25}').pass);
 probe('focus-default-wrong-context-rejected',!verifyDefaultFocusAlpha('.unknown{--bs-focus-ring-opacity:1}').pass);
 probe('focus-default-duplicate-rejected',!verifyDefaultFocusAlpha(':root,[data-bs-theme=light]{--bs-focus-ring-opacity:1;--bs-focus-ring-opacity:1}').pass);
 probe('focus-default-important-rejected',!verifyDefaultFocusAlpha(':root,[data-bs-theme=light]{--bs-focus-ring-opacity:1!important}').pass);
 probe('focus-default-other-family-absence-accepted',verifyDefaultFocusAlpha('a{color:red}',false).pass);
 probe('forced-close-mask-size-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('mask-size: 1em auto', 'mask-size: 2em auto')).pass);
 probe('forced-close-filter-restoration-rejected',!verifyForcedOverlay(forcedOverlay.replace('filter: none', 'filter: invert(1)')).pass);
 probe('normal-close-shadow-geometry-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--bs-btn-close-focus-shadow: 0 0 0 0.25rem', '--bs-btn-close-focus-shadow: 0 0 1px 0.25rem')).pass);
 probe('normal-close-custom-author-guard-removal-rejected',!verifyAccessibleSource(accessibleSource.replace('@if $btn-close-focus-shadow == (0 0 $focus-ring-blur $focus-ring-width $focus-ring-color)', '@if true'),accessibleEntry));
 probe('exact-utility-paint-overlay-accepted',verifyUtilityOverlay(utilityOverlay).pass);
 probe('minified-utility-paint-overlay-accepted',verifyUtilityOverlay(utilityMinifiedOverlay,true,true).pass);
 probe('utility-overlay-extra-geometry-rejected',!verifyUtilityOverlay(utilityOverlay.replace('--bs-focus-ring-color:', 'padding:1px;--bs-focus-ring-color:')).pass);
 probe('utility-overlay-unknown-property-rejected',!verifyUtilityOverlay(utilityOverlay.replace('--tq-mode-outline-primary:', '--unknown:')).pass);
 probe('utility-overlay-unknown-selector-rejected',!verifyUtilityOverlay(utilityOverlay.replace('.focus-ring-primary', '.unknown')).pass);
 probe('utility-overlay-context-change-rejected',!verifyUtilityOverlay(utilityOverlay.replace('.bg-body-secondary', '.bg-black')).pass);
 probe('utility-overlay-alpha-api-change-rejected',!verifyUtilityOverlay(utilityOverlay.replace('var(--bs-focus-ring-opacity)', '1')).pass);
 probe('utility-overlay-duplicate-rejected',!verifyUtilityOverlay(utilityOverlay+utilityOverlay).pass);
 probe('utility-overlay-nonfinal-rejected',!verifyUtilityOverlay(utilityOverlay+'a{color:red}').pass);
 probe('utility-source-extra-geometry-rejected',!verifyUtilitySource(utilitySource.replace('  color:', '  padding:1px; color:'),utilityEntry));
 probe('utility-source-unapproved-import-rejected',!verifyUtilitySource(utilitySource,utilityEntry+'@import "unknown";'));
 probe('utility-overlay-present-in-other-family-rejected',!verifyUtilityOverlay(utilityOverlay,false).pass);
 probe('forced-full-focus-helper-missing-rejected',!verifyForcedOverlay(forcedOverlay.replace('  .focus-ring:focus-visible,\n','')).pass);
 probe('forced-utility-helper-accepted',verifyForcedOverlay(utilityOverlay,false,false,true).pass);
 probe('forced-utility-helper-missing-rejected',!verifyForcedOverlay(utilityOverlay.replace('.focus-ring:focus-visible', '.unknown:focus-visible'),false,false,true).pass);
 probe('forced-utility-helper-outline-width-rejected',!verifyForcedOverlay(utilityOverlay.replace('2px solid CanvasText', '3px solid CanvasText'),false,false,true).pass);
 probe('forced-utility-helper-extra-geometry-rejected',!verifyUtilityOverlay(utilityOverlay.replace('outline-offset: 2px;', 'outline-offset: 2px; padding:1px;')).pass);
 probe('forced-utility-helper-on-other-family-rejected',!verifyForcedOverlay(utilityOverlay,false).pass);
 probe('forced-plaintext-focus-selector-missing-rejected',!verifyForcedOverlay(forcedOverlay.replace('  .form-control-plaintext:focus-visible,\n','')).pass);
 probe('forced-carousel-focus-selector-missing-rejected',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-control-prev:focus-visible,\n','')).pass);
 probe('forced-glyph-unknown-mask-image-rejected',!verifyForcedOverlay(forcedOverlay.replace('mask-image: var(--bs-btn-close-bg)', 'mask-image: url(unknown)')).pass);
 probe('forced-glyph-pseudo-position-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('inset: 0', 'inset: 1px')).pass);
 probe('forced-system-adjustment-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('forced-color-adjust: none', 'forced-color-adjust: auto')).pass);
 probe('forced-native-select-appearance-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('.form-select:not([multiple]):not([size])', '.unknown')).pass);
 probe('forced-selected-state-context-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('.nav-pills .nav-link.active', '.nav-pills .nav-link')).pass);
 probe('forced-progress-system-paint-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('background-color: CanvasText', 'background-color: Highlight')).pass);
 probe('forced-selected-label-weak-system-pair-rejected',!verifyForcedOverlay(forcedOverlay.replace('color: Canvas;\n    background-color: CanvasText;\n    border-color: CanvasText;', 'color: HighlightText;\n    background-color: Highlight;\n    border-color: Highlight;')).pass);
 probe('forced-selected-border-weak-system-paint-rejected',!verifyForcedOverlay(forcedOverlay.replace('border-color: CanvasText;', 'border-color: Highlight;')).pass);
 probe('normal-plaintext-outline-width-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('outline: 2px solid var', 'outline: 3px solid var')).pass);
 probe('normal-plaintext-context-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('.form-control-plaintext:focus-visible', '.form-control:focus-visible')).pass);
 probe('forced-rtl-literal-accepted',verifyForcedOverlay(forcedOverlayFor('rtl'),true,false,false,'rtl').pass);
 probe('forced-unflipped-rtl-icon-rejected',!verifyForcedOverlay(forcedOverlay,true,false,false,'rtl').pass);
 probe('forced-outer-carousel-filter-restoration-rejected',!verifyForcedOverlay(forcedOverlay.replace('.carousel-control-prev,\n  .carousel-control-next {\n    filter: none;', '.carousel-control-prev,\n  .carousel-control-next {\n    filter: invert(1);')).pass);
 probe('forced-carousel-system-backing-missing-rejected',!verifyForcedOverlay(forcedOverlay.replace('filter: none;\n    forced-color-adjust: none;\n    background-color: Canvas;', 'filter: none;\n    forced-color-adjust: none;')).pass);
 probe('forced-carousel-inset-ring-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('outline-offset: -4px;', 'outline-offset: 2px;')).pass);
 probe('forced-carousel-inset-ring-context-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('.carousel-control-prev:focus-visible,\n  .carousel-control-next:focus-visible {\n    outline-offset: -4px;', '.carousel-control-prev,\n  .carousel-control-next {\n    outline-offset: -4px;')).pass);
 probe('forced-select-native-height-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('min-height: calc(1.5em + 0.75rem', 'min-height: calc(1.5em + 1rem')).pass);
 probe('forced-select-small-size-context-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('.form-select.form-select-sm', '.form-select.form-select-lg')).pass);
 probe('forced-selected-tab-context-change-rejected',!verifyForcedOverlay(forcedOverlay.replace('.nav-tabs .nav-link.active', '.nav-tabs .nav-link')).pass);
 probe('three-exact-overlay-layers-accepted',verifyValidationOverlay(validationOverlay+accessibleOverlay+forcedOverlay,true,false,true,true).pass);
 probe('extra-rule-between-accessible-and-forced-layers-rejected',!verifyAccessibleOverlay(accessibleOverlay+'a{color:red}'+forcedOverlay,true,false,true).pass);
 probe('normal-range-mode-paint-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--tq-mode-range-thumb-bg: #fc545c','--tq-mode-range-thumb-bg: #e31b23')).pass);
 probe('normal-nested-navbar-context-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('.navbar[data-bs-theme=light] .navbar-toggler-icon','.navbar .navbar-toggler-icon')).pass);
 probe('normal-indicator-opacity-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('background-color: var(--tq-carousel-indicator-inactive-bg','opacity: .6; background-color: var(--tq-carousel-indicator-inactive-bg')).pass);
 probe('normal-selected-ink-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--tq-mode-active-colour: #091135','--tq-mode-active-colour: #fff')).pass);
 probe('normal-tabs-border-width-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--bs-nav-tabs-link-active-border-color:', 'border-width: 2px; --bs-nav-tabs-link-active-border-color:')).pass);
 probe('normal-selected-non-tq-primary-guard-required',!verifyAccessibleSource(accessibleSource.replace('$primary == $tq-red and ',''),accessibleEntry));
 probe('normal-pressed-border-width-change-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--bs-btn-active-border-color: var(--tq-mode-active-button-border-primary', 'border-width: 2px; --bs-btn-active-border-color: var(--tq-mode-active-button-border-primary')).pass);
 probe('normal-pressed-border-unknown-role-rejected',!verifyAccessibleOverlay(accessibleOverlay.replace('--tq-mode-active-outline-border-primary: #fff','--tq-mode-active-outline-border-primary: #091135')).pass);
 probe('normal-pressed-authored-shade-guard-required',!verifyAccessibleSource(accessibleSource.replace(' and $btn-active-border-shade-amount == 25%',''),accessibleEntry));
 const authored=authoredControlBoundaryProofs();
 probe('authored-non-tq-primary-selected-defaults-preserved',authored.primary);
 probe('authored-selected-bg-override-preserved',authored.selected);
 probe('authored-direct-range-paint-overrides-bypass-aliases',authored.range);
 probe('authored-non-tq-primary-pressed-border-remains-native',authored.button);
 probe('forced-progress-utility-fill-precedence-required',!verifyForcedOverlay(forcedOverlay.replace('background-color: CanvasText !important;', 'background-color: CanvasText;')).pass);
 probe('forced-progress-utility-label-precedence-required',!verifyForcedOverlay(forcedOverlay.replace('color: Canvas !important;', 'color: Canvas;')).pass);
 probe('forced-progress-utility-unknown-context-rejected',!verifyForcedOverlay(forcedOverlay.replace('  .progress-bar {\n    color: Canvas !important;', '  .unknown {\n    color: Canvas !important;')).pass);
 probe('forced-indicator-backing-required',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-indicators {\n    forced-color-adjust: none;\n    background-color: Canvas;', '  .carousel-indicators {\n    forced-color-adjust: none;\n    background-color: transparent;')).pass);
 probe('forced-indicator-specificity-precedence-required',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-indicators [data-bs-target] {\n    forced-color-adjust: none;\n    background-color: CanvasText !important;', '  .carousel-indicators [data-bs-target] {\n    forced-color-adjust: none;\n    background-color: CanvasText;')).pass);
 probe('forced-indicator-native-opacity-preserved',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-indicators [data-bs-target] {','  .carousel-indicators [data-bs-target] {\n    opacity: .6;')).pass);
 probe('forced-indicator-focus-inset-required',!verifyForcedOverlay(forcedOverlay.replace('outline-offset: -2px;', 'outline-offset: 2px;')).pass);
 probe('forced-indicator-focus-width-preserved',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-indicators [data-bs-target]:focus-visible {\n    outline: 2px solid CanvasText;', '  .carousel-indicators [data-bs-target]:focus-visible {\n    outline: 3px solid CanvasText;')).pass);
 probe('forced-indicator-focus-context-preserved',!verifyForcedOverlay(forcedOverlay.replace('  .carousel-indicators [data-bs-target]:focus-visible {','  .carousel-indicators [data-bs-target] {')).pass);
 probe('forced-firefox-select-native-ink-required',!verifyForcedOverlay(forcedOverlay.replace('color: FieldText;', 'color: transparent;')).pass);
 probe('forced-firefox-select-hidden-shadow-rejected',!verifyForcedOverlay(forcedOverlay.replace('text-shadow: none;', 'text-shadow: 0 0 0 red;')).pass);
 probe('forced-firefox-select-native-context-preserved',!verifyForcedOverlay(forcedOverlay.replace('.form-select:-moz-focusring {', '.form-select:focus {')).pass);
 return result;
}
let authoredControlProofCache;
function authoredControlBoundaryProofs(){
 if(authoredControlProofCache)return authoredControlProofCache;
 const compile=variables=>postcss.parse(sass.compileString(variables+'\n@import "tq-bootstrap";',{loadPaths:[path.join(root,'src/scss'),path.join(root,'node_modules')],style:'expanded',silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}}).css);
 const vals=(ast,selector,prop)=>{const v=[];ast.walkRules(selector,r=>r.walkDecls(prop,d=>v.push(d.value)));return v;};
 const states=[['.nav-pills','--bs-nav-pills-link-active-bg'],['.pagination','--bs-pagination-active-bg'],['.list-group','--bs-list-group-active-bg'],['.dropdown-menu','--bs-dropdown-link-active-bg']];
 const first=compile('$primary:#0055ff;$form-range-thumb-bg:#123456;$form-range-thumb-active-bg:#234567;$form-range-track-bg:#345678;');
 const second=compile('$component-active-bg:#804000;');
 const primary=states.every(([s,p])=>{const v=vals(first,s,p);return v.length>0&&v.every(x=>x==='#0055ff');});
 const selected=states.every(([s,p])=>{const v=vals(second,s,p);return v.length>0&&v.every(x=>x==='#804000');});
 const range=[['.form-range::-webkit-slider-thumb','#123456'],['.form-range::-webkit-slider-thumb:active','#234567'],['.form-range::-webkit-slider-runnable-track','#345678'],['.form-range::-moz-range-thumb','#123456'],['.form-range::-moz-range-thumb:active','#234567'],['.form-range::-moz-range-track','#345678']].every(([s,c])=>{const v=vals(first,s,'background-color').filter(x=>!['Canvas','CanvasText'].includes(x));return v.length>0&&v.every(x=>x===c);});
 const button=vals(first,'.btn-primary','--bs-btn-active-border-color').every(x=>!x.includes('--tq-mode-active-button-border'));
 return authoredControlProofCache={primary,selected,range,button};
}
export {maskValue,maskCSS,model,differences,verifyValidationOverlay,validationOverlay,validationMinifiedOverlay,verifyAccessibleOverlay,accessibleOverlay,accessibleMinifiedOverlay,verifyForcedOverlay,forcedOverlay,forcedMinifiedOverlay,forcedOverlayFor,paintBoundaryProbes,verifyDefaultFocusAlpha,verifyUtilityOverlay,utilityOverlay,utilityMinifiedOverlay};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
await fs.mkdir(out,{recursive:true});await fs.mkdir(references,{recursive:true});
const browsers=(await fs.readFile(path.join(root,'upstream/bootstrap-source/.browserslistrc'),'utf8')).split(/\r?\n/).map(line=>line.replace(/#.*/,'').trim()).filter(Boolean);const prefix=()=>autoprefixer({cascade:false,overrideBrowserslist:browsers});
const report={suite:baseline?'Exhaustive audit of pre-restoration non-colour changes':'Colour-only Bootstrap compiled distribution parity',started:new Date().toISOString(),scope:'All full, grid, reboot and utilities CSS distributions; LTR/RTL; expanded/minified. Compare both a same-toolchain original-source build and independently the original published release CSS. Original Bootstrap source JavaScript and distributions. CSS comments/source-map annotations are excluded from semantic CSS comparisons. JavaScript is compared byte-for-byte.',method:'Build pinned native Bootstrap 5.3.8 with identical Sass/PostCSS/Autoprefixer/original browserslist/RTL/CleanCSS stages. Esbuild is used only for post-mask comparison canonicalisation. Mask only CSS paint values, named paint literals, colour functions, RGB colour custom-property triplets and SVG paint attributes. Preserve all SVG path/viewBox/geometry attributes, CSS shadow geometry, gradients and every non-colour declaration. Expanded ASTs must match exactly. Minified paint-masked ASTs are re-minified with esbuild to canonicalise colour-only optimisation/selector merges before exact comparison. No whole declaration is dropped for containing a colour, shadow or SVG.',tools:{sass:sass.info,esbuild:esbuild.version,postcss:postcss().version,cleanCSS:require('clean-css/package.json').version,autoprefixer:require('autoprefixer/package.json').version,browserslist:require('browserslist/package.json').version,caniuseLite:require('caniuse-lite/package.json').version,rtlcss:require('rtlcss/package.json').version},browserslist:browsers,distributions:[],officialPublished:[],javascript:[],limits:['This parity audit verifies preservation of Bootstrap non-colour design/behaviour sources; it does not establish WCAG conformance.']};
const validationActual=await fs.readFile(path.join(root,'src/scss/_validation-colours.scss'),'utf8'),entryActual=await fs.readFile(path.join(root,'src/scss/tq-bootstrap.scss'),'utf8'),accessibleActual=await fs.readFile(path.join(root,'src/scss/_accessible-colours.scss'),'utf8'),forcedActual=await fs.readFile(path.join(root,'src/scss/_forced-colours.scss'),'utf8'),utilityActual=await fs.readFile(path.join(root,'src/scss/_accessible-utility-colours.scss'),'utf8'),utilityEntryActual=await fs.readFile(path.join(root,'src/scss/tq-bootstrap-utilities.scss'),'utf8');
report.sourceFingerprints=Object.fromEntries(await Promise.all(['src/scss/_tokens.scss','src/scss/_validation-colours.scss','src/scss/_validation-focus-colours.scss','src/scss/_accessible-colours.scss','src/scss/_forced-colours.scss','src/scss/tq-bootstrap.scss','qa/compiled-parity.mjs','qa/remediation/approved-paint-literals.mjs','src/scss/_accessible-utility-colours.scss','src/scss/tq-bootstrap-utilities.scss'].map(async file=>[file,hash(await fs.readFile(path.join(root,file)))])));
const otherEntries=await Promise.all(['tq-bootstrap-grid','tq-bootstrap-reboot','tq-bootstrap-utilities'].map(async name=>({file:'src/scss/'+name+'.scss',importsOverlay:(await fs.readFile(path.join(root,'src/scss',name+'.scss'),'utf8')).includes('validation-colours')})));
report.paintOnlyOverlay={applied:!baseline,sourceFile:'src/scss/_validation-colours.scss',sourceSHA256:hash(validationActual),entryFile:'src/scss/tq-bootstrap.scss',entrySHA256:hash(entryActual),sourceExact:validationActual===validationSource,entryExact:entryActual===accessibleEntry,otherEntries,selectors:validationSelectors,property:'background-color',rules:validationGroups.map(group=>({selectors:group.selectors,value:'var(--bs-'+group.role+')'})),pass:validationActual===validationSource&&entryActual===accessibleEntry&&otherEntries.every(entry=>!entry.importsOverlay)};
report.accessiblePaintOverlay={applied:!baseline,sourceFile:'src/scss/_accessible-colours.scss',sourceSHA256:hash(accessibleActual),sourceExact:accessibleActual===accessibleSource,entryExact:entryActual===accessibleEntry,otherEntries:await Promise.all(['tq-bootstrap-grid','tq-bootstrap-reboot','tq-bootstrap-utilities'].map(async name=>({file:'src/scss/'+name+'.scss',importsOverlay:(await fs.readFile(path.join(root,'src/scss',name+'.scss'),'utf8')).includes('accessible-colours')}))),expectedOverlay:accessibleOverlay,comparisonStage:'Append independently literal CSS after original validation paint overlay and before native minification.',pass:false};
report.accessiblePaintOverlay.pass=verifyAccessibleSource(accessibleActual,entryActual)&&report.accessiblePaintOverlay.otherEntries.every(e=>!e.importsOverlay);
report.forcedColoursAccessibilityOverlay={applied:!baseline,sourceFile:'src/scss/_forced-colours.scss',sourceSHA256:hash(forcedActual),sourceExact:forcedActual===forcedSource,entryExact:entryActual===accessibleEntry,expectedOverlay:forcedOverlay,media:'(forced-colors: active)',allowedExceptions:postcss.parse(forcedOverlay).first.nodes.filter(n=>n.type==='rule').map(rule=>({selectors:postcss.list.comma(rule.selector),properties:Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value]))})),reason:'System high-contrast suppresses Bootstrap focus shadows, white SVG checked glyphs and native track/thumb paints. Exact native outlines/appearance adaptation applies only in forced colours; normal-mode geometry and all other declarations remain strict.',pass:forcedActual===forcedSource&&entryActual===accessibleEntry};
report.method+=' The known --bs-focus-ring-opacity default changes only from native .25 to1 and is independently required once at the exact native root selector; every other alpha/property remains strict. One explicit non-paint accessibility media block is independently enumerated and appended after the two paint layers: forced-colors:active only, 16 exact control/helper-focus selectors get outline:2px solid CanvasText and outline-offset:2px; only native checkbox/radio inputs receive prefixed appearance:auto and background-image:none; four exact native range pseudo-elements receive system track/thumb paint and a1px thumb border. Its complete source, media context, rule position, selectors and every declaration are exact-verified before comparison. No outline/appearance value is globally masked. Normal-mode geometry remains native.';
report.utilityPaintOverlay={sourceFile:'src/scss/_accessible-utility-colours.scss',sourceSHA256:hash(utilityActual),entryFile:'src/scss/tq-bootstrap-utilities.scss',entrySHA256:hash(utilityEntryActual),sourceExact:utilityActual===utilitySource,entryExact:utilityEntryActual===utilityEntry,expectedOverlay:utilityOverlay,pass:verifyUtilitySource(utilityActual,utilityEntryActual)};
report.utilityPaintOverlay.entries=await Promise.all(['tq-bootstrap','tq-bootstrap-grid','tq-bootstrap-reboot','tq-bootstrap-utilities'].map(async name=>{const file='src/scss/'+name+'.scss',source=await fs.readFile(path.join(root,file),'utf8'),imports=(source.match(/@import \"accessible-utility-colours\"/g)||[]).length,expected=name==='tq-bootstrap-utilities'?1:0;return {file,sourceSHA256:hash(source),imports,expected,pass:imports===expected};}));
report.utilityPaintOverlay.pass=report.utilityPaintOverlay.pass&&report.utilityPaintOverlay.entries.every(e=>e.pass);
report.method+=' Standalone utilities receive an independently literal, exactly source/entry-verified focus/reading paint layer. It contains only native helper/utility contexts, with no component selectors or geometry, and is independently appended to utilities reference CSS before native minification. Every other family must omit this layer.';
report.method+=' Only the exact final var(--bs-border-color)/var(--bs-secondary-color) colour slot after var(--bs-border-width) solid is recognised as native border-shorthand paint. Widths, styles, unknown variables, other slots and other properties remain strict. Independent Sass boundary probes compile explicit non-TQ primary/selected colours and direct range track/thumb overrides to verify that default colour adaptations preserve author customisation.';
report.normalFocusAccessibilityException={selector:'.form-control-plaintext:focus-visible',properties:{outline:'2px solid var(--tq-focus-ring-colour, var(--bs-body-color))','outline-offset':'2px'},reason:'Native read-only plaintext controls remain sequential keyboard stops but suppress every focus indicator. This exact accessibility outline changes no box dimensions.'};
report.method+=' The exact plaintext-input focus-visible outline is an explicit normal-mode accessibility exception; no other normal-mode geometry is exempt. Forced glyph masks preserve native SVG paths and dimensions, isolating close glyph paint in a pseudo-element so outer focus remains visible. Carousel mask images retain their original RTL directives, and expected forced RTL literals are independently processed by pinned rtlcss.';
report.paintBoundaryProbes=paintBoundaryProbes();
report.method+=' An additional strictly enumerated contextual paint overlay preserves readable mode-aware outline roles, native focus-shadow geometry with opaque supported-host ink, role focus-ring alpha interfaces, navbar search ink and secondary reading ink on dark fills. Its complete Sass source and compiled rule declarations are independently enumerated, must occupy the final root positions, and are appended before native reference minification. No other selector/property/context is exempt. The validation overlay must be immediately before this exact layer. One explicitly enumerated colour-only overlay is appended to each native full-CSS comparison reference before its original minification stage: the two original checked valid form-check contexts receive only background-color:var(--bs-success), and the two checked invalid contexts receive only background-color:var(--bs-danger). Its Sass source and final import are compared byte-for-byte to independent constants, and each actual full distribution must contain exactly those two root rules in that order immediately before the enumerated accessible paint layer, each with one declaration and no !important. Their semantic roles cannot be swapped. Other CSS families must contain no overlay. All other selectors, declarations, rule order, SVG paths and geometry remain subject to the original strict comparison. Only var(--bs-body-color) or var(--tq-focus-ring-colour, var(--bs-body-color)) in the final colour slot after two to four numeric shadow lengths is recognised as semantic shadow paint; numeric geometry and other variables remain exact.';
for(const family of families){
 const compiled=sass.compile(path.join(root,'upstream/bootstrap/scss',family+'.scss'),{loadPaths:[path.join(root,'node_modules')],style:'expanded',silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}}).css;const native=(await postcss([prefix()]).process(compiled,{from:family+'.css',to:family+'.css',map:false})).css;
 for(const direction of ['ltr','rtl']){
  const stem=family+(direction==='rtl'?'.rtl':'');const expanded=direction==='rtl'?(await postcss([prefix(),rtlcss]).process(native,{from:family+'.css',to:stem+'.css',map:false})).css:native;
  for(const minified of [false,true]){
   const name=stem+(minified?'.min':'')+'.css',withOverlay=!baseline&&family==='bootstrap',withUtilityOverlay=!baseline&&family==='bootstrap-utilities',comparisonExpanded=expanded+(withOverlay?'\n'+validationOverlay+accessibleOverlay+forcedOverlayFor(direction):withUtilityOverlay?'\n'+utilityOverlay:'');const expected=minified?new CleanCSS({level:1,sourceMap:true}).minify(comparisonExpanded).styles:comparisonExpanded;const originalReference=minified?new CleanCSS({level:1,sourceMap:true}).minify(expanded).styles:expanded;await fs.writeFile(path.join(references,name),originalReference);
   const actual=await fs.readFile(path.join(actualDir,name),'utf8');let e=maskCSS(expected),a=maskCSS(actual);const originalSVG=model(e).svg,actualSVG=model(a).svg;
   if(minified){e=postcss.parse((await esbuild.transform(e.toString(),{loader:'css',minify:true,legalComments:'none'})).code);a=postcss.parse((await esbuild.transform(a.toString(),{loader:'css',minify:true,legalComments:'none'})).code);}
   const em=model(e),am=model(a);const findings=differences(em,am),overlayProof=verifyValidationOverlay(actual,withOverlay,minified,withOverlay,withOverlay,direction),accessibleOverlayProof=verifyAccessibleOverlay(actual,withOverlay,minified,withOverlay,direction),forcedOverlayProof=verifyForcedOverlay(actual,withOverlay,minified,withUtilityOverlay,direction),focusAlphaProof=verifyDefaultFocusAlpha(actual,!baseline&&family!=='bootstrap-grid'),utilityOverlayProof=verifyUtilityOverlay(actual,withUtilityOverlay,minified);if(!baseline&&!utilityOverlayProof.pass)findings.push({type:'invalid-utility-paint-overlay',proof:utilityOverlayProof});if(withUtilityOverlay&&!report.utilityPaintOverlay.pass)findings.push({type:'invalid-utility-paint-source'});if(!baseline&&!focusAlphaProof.pass)findings.push({type:'invalid-default-focus-alpha',proof:focusAlphaProof});if(!baseline&&!overlayProof.pass)findings.push({type:'invalid-validation-colour-overlay',proof:overlayProof});if(withOverlay&&!report.paintOnlyOverlay.pass)findings.push({type:'invalid-validation-colour-overlay-source'});if(!baseline&&!accessibleOverlayProof.pass)findings.push({type:'invalid-accessible-paint-overlay',proof:accessibleOverlayProof});if(withOverlay&&!report.accessiblePaintOverlay.pass)findings.push({type:'invalid-accessible-paint-overlay-source'});if(!baseline&&!forcedOverlayProof.pass)findings.push({type:'invalid-forced-colours-accessibility-overlay',proof:forcedOverlayProof});if(withOverlay&&!report.forcedColoursAccessibilityOverlay.pass)findings.push({type:'invalid-forced-colours-accessibility-source'});if(report.paintBoundaryProbes.some(probe=>!probe.pass))findings.push({type:'paint-boundary-probe-failure'});const entry={file:name,direction,minified,nativeReferenceSHA256:hash(originalReference),comparisonIncludesValidationColourOverlay:withOverlay,overlayProof,accessibleOverlayProof,forcedOverlayProof,focusAlphaProof,utilityOverlayProof,expectedSHA256:hash(expected),actualSHA256:hash(actual),expectedPaintMaskedSHA256:hash(JSON.stringify(em.records)),actualPaintMaskedSHA256:hash(JSON.stringify(am.records)),expectedRules:em.rules.length,actualRules:am.rules.length,expectedDeclarations:em.rules.reduce((n,r)=>n+r.declarations.length,0),actualDeclarations:am.rules.reduce((n,r)=>n+r.declarations.length,0),svg:{expectedOccurrences:originalSVG.length,actualOccurrences:actualSVG.length,expected:originalSVG,actual:actualSVG},pass:!findings.length,findings};report.distributions.push(entry);
   const officialFile='upstream/bootstrap/dist/css/'+name,officialCSS=await fs.readFile(path.join(root,officialFile),'utf8'),officialComparison=officialCSS+(withOverlay?'\n'+(minified?validationMinifiedOverlay+accessibleMinifiedOverlay+forcedOverlayFor(direction,true):validationOverlay+accessibleOverlay+forcedOverlayFor(direction)):withUtilityOverlay?'\n'+(minified?utilityMinifiedOverlay:utilityOverlay):'');let published=maskCSS(officialComparison),target=maskCSS(actual);if(minified){published=postcss.parse((await esbuild.transform(published.toString(),{loader:'css',minify:true,legalComments:'none'})).code);target=postcss.parse((await esbuild.transform(target.toString(),{loader:'css',minify:true,legalComments:'none'})).code);}const pm=model(published),tm=model(target),officialFindings=differences(pm,tm);if(!baseline&&!utilityOverlayProof.pass)officialFindings.push({type:'invalid-utility-paint-overlay',proof:utilityOverlayProof});if(withUtilityOverlay&&!report.utilityPaintOverlay.pass)officialFindings.push({type:'invalid-utility-paint-source'});if(!baseline&&!focusAlphaProof.pass)officialFindings.push({type:'invalid-default-focus-alpha',proof:focusAlphaProof});if(!baseline&&!overlayProof.pass)officialFindings.push({type:'invalid-validation-colour-overlay',proof:overlayProof});if(withOverlay&&!report.paintOnlyOverlay.pass)officialFindings.push({type:'invalid-validation-colour-overlay-source'});if(!baseline&&!accessibleOverlayProof.pass)officialFindings.push({type:'invalid-accessible-paint-overlay',proof:accessibleOverlayProof});if(withOverlay&&!report.accessiblePaintOverlay.pass)officialFindings.push({type:'invalid-accessible-paint-overlay-source'});if(!baseline&&!forcedOverlayProof.pass)officialFindings.push({type:'invalid-forced-colours-accessibility-overlay',proof:forcedOverlayProof});if(withOverlay&&!report.forcedColoursAccessibilityOverlay.pass)officialFindings.push({type:'invalid-forced-colours-accessibility-source'});report.officialPublished.push({file:name,sourceFile:officialFile,expectedSHA256:hash(officialCSS),expectedComparisonSHA256:hash(officialComparison),actualSHA256:hash(actual),comparisonIncludesValidationColourOverlay:withOverlay,overlayProof,accessibleOverlayProof,forcedOverlayProof,focusAlphaProof,utilityOverlayProof,expectedRules:pm.rules.length,actualRules:tm.rules.length,expectedDeclarations:pm.rules.reduce((n,r)=>n+r.declarations.length,0),actualDeclarations:tm.rules.reduce((n,r)=>n+r.declarations.length,0),expectedPaintMaskedSHA256:hash(JSON.stringify(pm.records)),actualPaintMaskedSHA256:hash(JSON.stringify(tm.records)),pass:!officialFindings.length,findings:officialFindings});console.log(`${entry.pass&&!officialFindings.length?'pass':'FAIL'} ${name}: ${findings.length} native-reference, ${officialFindings.length} official-release non-colour findings`);
  }
 }
}
async function files(dir){const all=[];for(const d of await fs.readdir(dir,{withFileTypes:true})){const target=path.join(dir,d.name);if(d.isDirectory())all.push(...await files(target));else all.push(target);}return all;}
const expectedJS=new Map();for(const [from,to]of[['upstream/bootstrap/dist/js','dist/js'],['upstream/bootstrap/js','dist/js/plugins']])for(const file of await files(path.join(root,from))){const relative=path.relative(path.join(root,from),file);expectedJS.set(path.join(to,relative).replaceAll('\\','/'),file);}
for(const [target,source]of expectedJS){let actual;try{actual=await fs.readFile(path.join(root,target));}catch{}const expected=await fs.readFile(source);report.javascript.push({file:target,expectedSHA256:hash(expected),actualSHA256:actual?hash(actual):null,pass:Boolean(actual)&&expected.equals(actual)});}
const extras=(await files(path.join(root,'dist/js'))).map(file=>path.relative(root,file).replaceAll('\\','/')).filter(file=>!expectedJS.has(file));for(const file of extras)report.javascript.push({file,pass:false,reason:'Additional JavaScript artifact outside the original Bootstrap distribution/module tree'});
const frequency={};for(const d of report.distributions)for(const f of d.findings)frequency[f.property||f.type]=(frequency[f.property||f.type]||0)+1;
report.semanticPaintProperties=[...semanticPaintProperties].sort();report.summary={distributions:report.distributions.length,passedDistributions:report.distributions.filter(d=>d.pass).length,failedDistributions:report.distributions.filter(d=>!d.pass).length,nonColourFindings:report.distributions.reduce((n,d)=>n+d.findings.length,0),publishedDistributions:report.officialPublished.length,publishedPassed:report.officialPublished.filter(d=>d.pass).length,publishedFailed:report.officialPublished.filter(d=>!d.pass).length,publishedNonColourFindings:report.officialPublished.reduce((n,d)=>n+d.findings.length,0),javascriptFiles:report.javascript.length,javascriptFailures:report.javascript.filter(d=>!d.pass).length,changedProperties:frequency,paintBoundaryProbes:report.paintBoundaryProbes.length,paintBoundaryProbeFailures:report.paintBoundaryProbes.filter(probe=>!probe.pass).length,paintOnlyOverlaySourcePass:report.paintOnlyOverlay.pass,accessibleOverlaySourcePass:report.accessiblePaintOverlay.pass,forcedColoursSourcePass:report.forcedColoursAccessibilityOverlay.pass,utilityOverlaySourcePass:report.utilityPaintOverlay.pass,utilityOverlayDistributionFailures:report.distributions.filter(d=>!d.utilityOverlayProof.pass).length,focusAlphaDefaultPass:report.distributions.every(d=>d.focusAlphaProof.pass),focusAlphaDistributionFailures:report.distributions.filter(d=>!d.focusAlphaProof.pass).length,forcedColoursDistributionFailures:report.distributions.filter(d=>!d.forcedOverlayProof.pass).length,accessibleOverlayDistributionFailures:report.distributions.filter(distribution=>!distribution.accessibleOverlayProof.pass).length,overlayDistributionFailures:report.distributions.filter(distribution=>!distribution.overlayProof.pass).length};report.finished=new Date().toISOString();const output=baseline?'pre-colour-only-deviations.json':'colour-only-parity.json';await fs.writeFile(path.join(out,output),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));if(!baseline&&(report.summary.failedDistributions||report.summary.publishedFailed||report.summary.javascriptFailures))process.exitCode=1;
}
