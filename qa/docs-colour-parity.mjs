import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as sass from 'sass';
import postcss from 'postcss';
import * as esbuild from 'esbuild';
import {maskValue,model,differences} from './compiled-parity.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>createHash('sha256').update(value).digest('hex');
const refs=path.join(root,'qa/reference-native');
const rgbPaintVariables=new Set();
const accessibilityDecoration={selector:'.bd-footer .list-unstyled.small a',property:'text-decoration',value:'underline',important:false,reason:'Persistent differentiation of prose links, explicitly authorised accessibility exception. Decoration does not change text dimensions.'};
function verifyAccessibilityDecoration(css){
 const ast=postcss.parse(css),matches=[];ast.walkRules(rule=>{if(rule.selector.trim()===accessibilityDecoration.selector)matches.push(rule);});
 const rules=matches.map(rule=>{const declarations=rule.nodes.filter(n=>n.type!=='comment');return{selector:rule.selector,root:rule.parent===ast,declarations:declarations.map(d=>({type:d.type,property:d.prop,value:d.value,important:Boolean(d.important)})),pass:rule.parent===ast&&declarations.length===1&&declarations[0].type==='decl'&&declarations[0].prop===accessibilityDecoration.property&&declarations[0].value===accessibilityDecoration.value&&!declarations[0].important};});
 return{pass:rules.length===1&&rules.every(r=>r.pass),occurrences:rules.length,rules,...accessibilityDecoration};
}
const accessibilityDecorationProbes=[
 ['exact-footer-prose-decoration-accepted','.bd-footer .list-unstyled.small a{text-decoration:underline}',true],
 ['footer-decoration-extra-geometry-rejected','.bd-footer .list-unstyled.small a{text-decoration:underline;padding:1px}',false],
 ['footer-decoration-other-property-rejected','.bd-footer .list-unstyled.small a{text-decoration-line:underline}',false],
 ['footer-decoration-other-value-rejected','.bd-footer .list-unstyled.small a{text-decoration:none}',false],
 ['footer-decoration-other-selector-rejected','.bd-footer a{text-decoration:underline}',false],
 ['footer-decoration-nested-context-rejected','@media (min-width:1px){.bd-footer .list-unstyled.small a{text-decoration:underline}}',false],
 ['footer-decoration-duplicate-rejected','.bd-footer .list-unstyled.small a{text-decoration:underline}.bd-footer .list-unstyled.small a{text-decoration:underline}',false]
].map(([name,css,expected])=>({name,pass:verifyAccessibilityDecoration(css).pass===expected}));
// Independent literal: do not derive either this selector or its dimensions
// from the TQ source being tested. The extra colour is the existing header ink.
const accessibilityHeaderFocus={selector:'.bd-navbar .navbar-toggler:focus-visible',property:'box-shadow',value:'0 0 0 var(--bs-navbar-toggler-focus-width) var(--tq-docs-header-color)',important:false,reason:'Restore the original Bootstrap navbar focus-shadow geometry where the documentation removes it and opaque TQ header ink no longer changes on keyboard focus.'};
function verifyAccessibilityHeaderFocus(css){
 const ast=postcss.parse(css),rules=[];ast.walkRules(rule=>{if(rule.selector.trim()!==accessibilityHeaderFocus.selector)return;const declarations=rule.nodes.filter(n=>n.type!=='comment');rules.push({selector:rule.selector,root:rule.parent===ast,declarations:declarations.map(d=>({type:d.type,property:d.prop,value:d.value,important:Boolean(d.important)})),pass:rule.parent===ast&&declarations.length===1&&declarations[0].type==='decl'&&declarations[0].prop===accessibilityHeaderFocus.property&&declarations[0].value===accessibilityHeaderFocus.value&&!declarations[0].important});});
 return{...accessibilityHeaderFocus,pass:rules.length===1&&rules.every(r=>r.pass),occurrences:rules.length,rules};
}
const headerRule=value=>`${accessibilityHeaderFocus.selector}{box-shadow:${value}}`;
const accessibilityHeaderFocusProbes=[
 ['exact-native-header-focus-shadow-accepted',headerRule(accessibilityHeaderFocus.value),true],
 ['header-focus-shadow-width-change-rejected',headerRule('0 0 0 .5rem var(--tq-docs-header-color)'),false],
 ['header-focus-shadow-offset-change-rejected',headerRule('1px 0 0 var(--bs-navbar-toggler-focus-width) var(--tq-docs-header-color)'),false],
 ['header-focus-shadow-blur-change-rejected',headerRule('0 0 1px var(--bs-navbar-toggler-focus-width) var(--tq-docs-header-color)'),false],
 ['header-focus-shadow-unknown-paint-rejected',headerRule('0 0 0 var(--bs-navbar-toggler-focus-width) var(--unknown-color)'),false],
 ['header-focus-shadow-other-property-rejected',`${accessibilityHeaderFocus.selector}{outline:${accessibilityHeaderFocus.value}}`,false],
 ['header-focus-shadow-extra-property-rejected',`${accessibilityHeaderFocus.selector}{box-shadow:${accessibilityHeaderFocus.value};padding:1px}`,false],
 ['header-focus-shadow-other-selector-rejected',`.bd-navbar .btn:focus-visible{box-shadow:${accessibilityHeaderFocus.value}}`,false],
 ['header-focus-shadow-nested-context-rejected',`@media(min-width:1px){${headerRule(accessibilityHeaderFocus.value)}}`,false],
 ['header-focus-shadow-important-rejected',headerRule(accessibilityHeaderFocus.value+'!important'),false],
 ['header-focus-shadow-duplicate-rejected',headerRule(accessibilityHeaderFocus.value).repeat(2),false]
].map(([name,css,expected])=>({name,pass:verifyAccessibilityHeaderFocus(css).pass===expected}));
function verifyNativeHeaderFocus(css){
 const selector='.navbar-toggler:focus',expected=[{property:'text-decoration',value:'none',important:false},{property:'outline',value:'0',important:false},{property:'box-shadow',value:'0 0 0 var(--bs-navbar-toggler-focus-width)',important:false}],rules=[];postcss.parse(css).walkRules(rule=>{if(rule.selector===selector)rules.push(rule.nodes.filter(n=>n.type!=='comment').map(d=>({property:d.prop,value:d.value,important:Boolean(d.important)})));});
 return{selector,expected,rules,pass:rules.length===1&&JSON.stringify(rules[0])===JSON.stringify(expected)};
}
const accessibilitySearchCancel={selector:'.DocSearch-Cancel:focus-visible',rules:[{context:[],declarations:[{property:'outline',value:'2px solid var(--docsearch-text-color)',important:false},{property:'outline-offset',value:'2px',important:false}]},{context:['@media (forced-colors: active)'],declarations:[{property:'outline-color',value:'CanvasText',important:false}]}],reason:'The original search reset removes every Cancel focus cue. Exact keyboard-only outline and system ink restore focus without changing control boxes.'};
function verifyAccessibilitySearchCancel(css){
 const rules=[];postcss.parse(css).walkRules(rule=>{if(rule.selector.trim()!==accessibilitySearchCancel.selector)return;const context=[];for(let p=rule.parent;p?.type!=='root';p=p.parent)context.unshift(p.type==='atrule'?'@'+p.name+' '+p.params:'<unexpected-nesting>');const nodes=rule.nodes.filter(n=>n.type!=='comment');rules.push({context,declarations:nodes.map(d=>({property:d.prop||'<not-a-declaration>',value:d.value||'',important:Boolean(d.important)}))});});
 return{...accessibilitySearchCancel,actualRules:rules,pass:JSON.stringify(rules)===JSON.stringify(accessibilitySearchCancel.rules)};
}
const searchCancelCSS='.DocSearch-Cancel:focus-visible{outline:2px solid var(--docsearch-text-color);outline-offset:2px}@media (forced-colors: active){.DocSearch-Cancel:focus-visible{outline-color:CanvasText}}';
const accessibilitySearchCancelProbes=[
 ['exact-search-cancel-focus-accepted',searchCancelCSS,true],
 ['search-cancel-width-change-rejected',searchCancelCSS.replace('outline:2px','outline:3px'),false],
 ['search-cancel-offset-change-rejected',searchCancelCSS.replace('outline-offset:2px','outline-offset:3px'),false],
 ['search-cancel-unknown-ink-rejected',searchCancelCSS.replace('--docsearch-text-color','--unknown-color'),false],
 ['search-cancel-extra-property-rejected',searchCancelCSS.replace('outline-offset:2px','outline-offset:2px;padding:1px'),false],
 ['search-cancel-missing-property-rejected',searchCancelCSS.replace(';outline-offset:2px',''),false],
 ['search-cancel-other-selector-rejected',searchCancelCSS.replaceAll('.DocSearch-Cancel:focus-visible','.DocSearch-Button:focus-visible'),false],
 ['search-cancel-other-context-rejected',searchCancelCSS.replace('(forced-colors: active)','(min-width:1px)'),false],
 ['search-cancel-important-rejected',searchCancelCSS.replace('outline-offset:2px','outline-offset:2px!important'),false],
 ['search-cancel-duplicate-rejected',searchCancelCSS+searchCancelCSS,false],
 ['search-cancel-weak-forced-ink-rejected',searchCancelCSS.replace('CanvasText','Highlight'),false],
 ['search-cancel-extra-forced-geometry-rejected',searchCancelCSS.replace('outline-color:CanvasText','outline-color:CanvasText;border-width:2px'),false],
 ['search-cancel-missing-forced-rule-rejected',searchCancelCSS.slice(0,searchCancelCSS.indexOf('@media')),false]
].map(([name,css,expected])=>({name,pass:verifyAccessibilitySearchCancel(css).pass===expected}));
const accessibilityForcedSearch={selector:'.DocSearch-Button:focus-visible',context:['@media (forced-colors: active)'],declarations:[{property:'outline',value:'2px solid CanvasText',important:false},{property:'outline-offset',value:'2px',important:false}],reason:'Forced system palettes suppress the normal native Search shadow. Exact forced-only outline restores keyboard focus without any normal-mode geometry change.'};
function verifyAccessibilityForcedSearch(css){
 const rules=[];postcss.parse(css).walkRules(rule=>{if(rule.selector.trim()!==accessibilityForcedSearch.selector)return;const context=[];for(let p=rule.parent;p?.type!=='root';p=p.parent)context.unshift(p.type==='atrule'?'@'+p.name+' '+p.params:'<unexpected-nesting>');rules.push({context,declarations:rule.nodes.filter(n=>n.type!=='comment').map(d=>({property:d.prop||'<not-a-declaration>',value:d.value||'',important:Boolean(d.important)}))});});
 return{...accessibilityForcedSearch,actualRules:rules,pass:rules.length===1&&JSON.stringify(rules[0])===JSON.stringify({context:accessibilityForcedSearch.context,declarations:accessibilityForcedSearch.declarations})};
}
const forcedSearchCSS='@media (forced-colors: active){.DocSearch-Button:focus-visible{outline:2px solid CanvasText;outline-offset:2px}}';
const accessibilityForcedSearchProbes=[
 ['exact-forced-search-outline-accepted',forcedSearchCSS,true],
 ['forced-search-width-change-rejected',forcedSearchCSS.replace('outline:2px','outline:3px'),false],
 ['forced-search-offset-change-rejected',forcedSearchCSS.replace('outline-offset:2px','outline-offset:3px'),false],
 ['forced-search-weak-ink-rejected',forcedSearchCSS.replace('CanvasText','Highlight'),false],
 ['forced-search-extra-geometry-rejected',forcedSearchCSS.replace('outline-offset:2px','outline-offset:2px;padding:1px'),false],
 ['forced-search-other-selector-rejected',forcedSearchCSS.replace('.DocSearch-Button:focus-visible','.DocSearch:focus-visible'),false],
 ['forced-search-normal-mode-rule-rejected',forcedSearchCSS.replace('@media (forced-colors: active){','').slice(0,-1),false],
 ['forced-search-other-context-rejected',forcedSearchCSS.replace('(forced-colors: active)','(min-width:1px)'),false],
 ['forced-search-important-rejected',forcedSearchCSS.replace('outline-offset:2px','outline-offset:2px!important'),false],
 ['forced-search-duplicate-rejected',forcedSearchCSS.repeat(2),false],
 ['forced-search-missing-property-rejected',forcedSearchCSS.replace(';outline-offset:2px',''),false]
].map(([name,css,expected])=>({name,pass:verifyAccessibilityForcedSearch(css).pass===expected}));
const isPaint=(prop,value)=>{
 if(/\burl\(|gradient\(/i.test(value))return false;
 if(/^(?:color|background-color|border(?:-(?:top|right|bottom|left|block(?:-start|-end)?|inline(?:-start|-end)?))?-color|outline-color|text-decoration-color|fill|stroke|caret-color|accent-color)$/.test(prop))return true;
 const paintFilter=value==='none'||value.replace(/(?:invert|grayscale|brightness|contrast|saturate|sepia|hue-rotate)\([^)]*\)/g,'').trim()==='';
 if((prop==='filter'||prop==='--tq-docs-close-filter')&&paintFilter)return true;
 if(prop==='filter'&&value==='var(--tq-docs-close-filter)')return true;
 return prop.startsWith('--')&&(rgbPaintVariables.has(prop)||/-(?:color|bg|rgb)$/.test(prop)||maskValue(value)==='#010203');
};
function alphaSignature(value){const list=[];for(const match of value.matchAll(/rgba?\((?:[^()]|\([^)]*\))*\)/g)){const body=match[0].slice(match[0].indexOf('(')+1,-1);let depth=0,parts=[''];for(const c of body){if(c==='(')depth++;if(c===')')depth--;if((c===','||c==='/')&&!depth)parts.push('');else parts[parts.length-1]+=c;}const explicit=match[0].startsWith('rgba(')||body.includes('/');list.push(explicit?parts.at(-1).trim():'1');}return list;}
function splitSelectors(value){const result=[];let depth=0,part='';for(const c of value){if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;if(c===','&&!depth){result.push(part.trim());part='';}else part+=c;}result.push(part.trim());return result;}
async function geometry(css){const ast=postcss.parse(css);let paintDeclarations=0;ast.walkComments(c=>c.remove());const records=new Map(),diagnostics=[];ast.walkRules(rule=>{const context=[];for(let p=rule.parent;p?.type!=='root';p=p.parent)if(p.type==='atrule')context.unshift('@'+p.name+' '+p.params);for(const selector of splitSelectors(rule.selector))for(const d of rule.nodes||[]){if(d.type!=='decl')continue;if(isPaint(d.prop,d.value)){paintDeclarations++;continue;}let value=maskValue(d.value,d.prop);const alpha=d.value.includes('gradient(')?alphaSignature(d.value):null;
 if(d.prop==='content'&&/^\.swatch-[\w-]+::?after$/.test(selector)){diagnostics.push({selector,content:d.value});value='"<native-colour-derived-contrast-diagnostic>"';}
 let canonical=postcss.parse((esbuild.transformSync(`a{${d.prop}:${value}${d.important?'!important':''}}`,{loader:'css',minify:true,legalComments:'none'})).code).first.first.value;if(d.prop.startsWith('--'))canonical=canonical.replace(/\s*,\s*/g,',').replace(/\(\s*/g,'(').replace(/\s*\)/g,')');
 records.set(JSON.stringify([context,selector.replaceAll('::',':'),d.prop]),{context,selector:selector.replaceAll('::',':'),property:d.prop,value:canonical,important:Boolean(d.important),...(alpha?{gradientAlphas:alpha}:{})});
 }});return {records,paintDeclarations,diagnostics};}
async function build(native){const source=path.join(root,native?'upstream/bootstrap-source/site/src/scss':'docs-source/site/src/scss');const imports='@import "docs";@import "docs_search";'+(native?'':'@import "tq-docs";');return sass.compileString(imports,{loadPaths:[source,path.join(root,'docs-source/node_modules'),path.join(root,'node_modules')],style:'expanded',silenceDeprecations:['import','global-builtin','color-functions','if-function'],logger:{warn(){},debug(){}}});}
await fs.mkdir(refs,{recursive:true});const nativeBuild=await build(true),themeBuild=await build(false),original=nativeBuild.css,themed=themeBuild.css;const sourceFingerprints={};for(const url of [...nativeBuild.loadedUrls,...themeBuild.loadedUrls])if(url.protocol==='file:'){const file=fileURLToPath(url);sourceFingerprints[path.relative(root,file).replaceAll('\\','/')]=sha(await fs.readFile(file));}sourceFingerprints['qa/docs-colour-parity.mjs']=sha(await fs.readFile(fileURLToPath(import.meta.url)));await fs.writeFile(path.join(refs,'docs-native.css'),original);await fs.writeFile(path.join(refs,'docs-themed.css'),themed);
for(const css of [original,themed]){for(const match of css.matchAll(/(?:rgb|rgba)\(var\((--[\w-]+)\)/g))rgbPaintVariables.add(match[1]);postcss.parse(css).walkDecls(d=>{if(/-(?:color|bg|rgb)$/.test(d.prop))for(const match of d.value.matchAll(/var\((--[\w-]+)/g))rgbPaintVariables.add(match[1]);});}const expected=await geometry(original),actual=await geometry(themed);const findings=[],allowedModeAliases=[];
for(const [key,value]of actual.records){if(expected.records.has(key))continue;const base=value.selector.replace(/^\[data-bs-theme=(?:dark|light)\]\s*/, '')||':root';const inherited=expected.records.get(JSON.stringify([value.context,base,value.property]))||((/^\[data-bs-theme=(?:light|dark)\]$/.test(value.selector)||value.selector===':root')?expected.records.get(JSON.stringify([value.context,':root',value.property])):null);if(inherited&&inherited.value===value.value&&JSON.stringify(inherited.gradientAlphas)===JSON.stringify(value.gradientAlphas)){actual.records.delete(key);allowedModeAliases.push({selector:value.selector,property:value.property,inheritedFrom:inherited.selector,value:value.value});}}
const accessibilityDecorationProof=verifyAccessibilityDecoration(themed);
const decorationKey=JSON.stringify([[],accessibilityDecoration.selector,accessibilityDecoration.property]);
if(accessibilityDecorationProof.pass&&!expected.records.has(decorationKey))actual.records.delete(decorationKey);else findings.push({type:'invalid-specific-accessibility-decoration-exception',proof:accessibilityDecorationProof,nativeAlreadyDefinesKey:expected.records.has(decorationKey)});
if(accessibilityDecorationProbes.some(p=>!p.pass))findings.push({type:'accessibility-decoration-boundary-probe-failure'});
const nativeHeaderFocusFile='upstream/bootstrap/dist/css/bootstrap.css',nativeHeaderCSS=await fs.readFile(path.join(root,nativeHeaderFocusFile),'utf8');sourceFingerprints[nativeHeaderFocusFile]=sha(nativeHeaderCSS);
const nativeHeaderFocusProof={file:nativeHeaderFocusFile,sha256:sha(nativeHeaderCSS),...verifyNativeHeaderFocus(nativeHeaderCSS)};
const accessibilityHeaderFocusProof={...verifyAccessibilityHeaderFocus(themed),nativeGeometry:nativeHeaderFocusProof};
const headerFocusKey=JSON.stringify([[],accessibilityHeaderFocus.selector,accessibilityHeaderFocus.property]);
if(accessibilityHeaderFocusProof.pass&&nativeHeaderFocusProof.pass&&!expected.records.has(headerFocusKey))actual.records.delete(headerFocusKey);else findings.push({type:'invalid-specific-accessibility-header-focus-exception',proof:accessibilityHeaderFocusProof,nativeAlreadyDefinesKey:expected.records.has(headerFocusKey)});
if(accessibilityHeaderFocusProbes.some(p=>!p.pass))findings.push({type:'accessibility-header-focus-boundary-probe-failure'});
const accessibilitySearchCancelProof=verifyAccessibilitySearchCancel(themed);
for(const declaration of accessibilitySearchCancel.rules[0].declarations){const key=JSON.stringify([[],accessibilitySearchCancel.selector,declaration.property]);if(accessibilitySearchCancelProof.pass&&!expected.records.has(key))actual.records.delete(key);else findings.push({type:'invalid-specific-accessibility-search-cancel-exception',property:declaration.property,proof:accessibilitySearchCancelProof,nativeAlreadyDefinesKey:expected.records.has(key)});}
if(accessibilitySearchCancelProbes.some(p=>!p.pass))findings.push({type:'accessibility-search-cancel-boundary-probe-failure'});
const accessibilityForcedSearchProof=verifyAccessibilityForcedSearch(themed);
for(const declaration of accessibilityForcedSearch.declarations){const key=JSON.stringify([accessibilityForcedSearch.context,accessibilityForcedSearch.selector,declaration.property]);if(accessibilityForcedSearchProof.pass&&!expected.records.has(key))actual.records.delete(key);else findings.push({type:'invalid-specific-accessibility-forced-search-exception',property:declaration.property,proof:accessibilityForcedSearchProof,nativeAlreadyDefinesKey:expected.records.has(key)});}
if(accessibilityForcedSearchProbes.some(p=>!p.pass))findings.push({type:'accessibility-forced-search-boundary-probe-failure'});
for(const key of new Set([...expected.records.keys(),...actual.records.keys()])){const e=expected.records.get(key),a=actual.records.get(key);if(JSON.stringify(e)!==JSON.stringify(a))findings.push({type:'non-colour-effective-declaration',expected:e||null,actual:a||null});}
const generator='site/src/scss/_colors.scss',generatorOriginal=await fs.readFile(path.join(root,'upstream/bootstrap-source',generator)),generatorActual=await fs.readFile(path.join(root,'docs-source',generator));if(!generatorOriginal.equals(generatorActual))findings.push({type:'changed-colour-diagnostic-generator'});const diagnosticExceptions=[];for(const e of expected.diagnostics){const a=actual.diagnostics.find(x=>x.selector===e.selector);if(a&&a.content!==e.content)diagnosticExceptions.push({selector:e.selector,property:'content',native:e.content,themed:a.content,reason:'Contrast diagnostic strings regenerated by byte-identical native Sass from the changed colours; explicitly permitted colour-derived exception.'});}
const sorted=m=>[...m.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));const report={suite:'Colour-only original Bootstrap documentation CSS parity',finished:new Date().toISOString(),method:'Compile native and themed docs Sass with the same toolchain. Remove only pure paint declarations/variables and verified paint-only filters; retain all shadow dimensions, SVG geometry, gradient geometry and alpha. Compare effective declarations per selector/context/property, permitting duplicate same-geometry overrides and exact native mode-inherited geometry aliases. Native generated swatch contrast readouts are listed with exact values and generator hashes. Exactly four non-paint accessibility exceptions are permitted: footer prose underline, native-width documentation-header keyboard focus, search Cancel keyboard outline, and forced-only Search trigger outline. The first two must each be one root rule with one exact declaration; Cancel must have exactly its two root outline declarations and one forced-system-ink declaration in the exact media context; the Search trigger must have only its two forced-outline declarations in that same exact media context. The header shadow geometry is independently verified against the pinned official Bootstrap component CSS; unknown selectors, dimensions, paint variables, properties, contexts, importance and duplicates remain failures. All other geometry remains strictly compared.',sourceFingerprints,accessibilityExceptions:[accessibilityDecorationProof,accessibilityHeaderFocusProof,accessibilitySearchCancelProof,accessibilityForcedSearchProof],accessibilityDecorationProbes,accessibilityHeaderFocusProbes,accessibilitySearchCancelProbes,accessibilityForcedSearchProbes,nativeHeaderFocusProof,expectedCSSSHA256:sha(original),actualCSSSHA256:sha(themed),allowedPaintDeclarations:{native:expected.paintDeclarations,themed:actual.paintDeclarations},allowedModeAliases,diagnosticGenerator:{file:generator,nativeSHA256:sha(generatorOriginal),themedSHA256:sha(generatorActual),byteIdentical:generatorOriginal.equals(generatorActual)},colourDerivedDiagnosticExceptions:diagnosticExceptions,expectedGeometrySHA256:sha(JSON.stringify(sorted(expected.records))),actualGeometrySHA256:sha(JSON.stringify(sorted(actual.records))),findings,summary:{checks:1,passed:findings.length?0:1,failed:findings.length?1:0,nonColourFindings:findings.length,colourDerivedDiagnosticExceptions:diagnosticExceptions.length,accessibilityExceptions:4,accessibilityExceptionFailures:[accessibilityDecorationProof.pass,accessibilityHeaderFocusProof.pass&&nativeHeaderFocusProof.pass,accessibilitySearchCancelProof.pass,accessibilityForcedSearchProof.pass].filter(pass=>!pass).length,accessibilityBoundaryProbes:accessibilityDecorationProbes.length+accessibilityHeaderFocusProbes.length+accessibilitySearchCancelProbes.length+accessibilityForcedSearchProbes.length,accessibilityBoundaryProbeFailures:[...accessibilityDecorationProbes,...accessibilityHeaderFocusProbes,...accessibilitySearchCancelProbes,...accessibilityForcedSearchProbes].filter(p=>!p.pass).length}};await fs.writeFile(path.join(root,'qa/results/colour-only-docs-parity.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(findings.length)process.exitCode=1;
