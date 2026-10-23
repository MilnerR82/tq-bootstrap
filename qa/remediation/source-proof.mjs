import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {verifySubstitutions} from '../colour-substitution-proof.mjs'

export const acceptedZIP='8aac11c1842da42bffefc3a19116fd29be02760c9722061dc07ada2441c9be8a'
const sha=b=>createHash('sha256').update(b).digest('hex')
const lf=s=>s.replaceAll('\r\n','\n')
function within(root,file){if(typeof file!=='string'||!file||path.isAbsolute(file)||file.split(/[\\/]/).includes('..'))throw Error('Unsafe evidence/source path: '+file);const resolved=path.resolve(root,file);if(!resolved.startsWith(path.resolve(root)+path.sep))throw Error('Evidence path outside root: '+file);return resolved}

export function verifyRemediationManifest(root){
 const file='qa/remediation-source/manifest.json',filename=path.join(root,file)
 if(!fs.existsSync(filename))return {available:false,pass:false,findings:[{type:'remediation-manifest-missing',file}],files:[],records:new Map()}
 const bytes=fs.readFileSync(filename),manifest=JSON.parse(bytes),findings=[],checks=[],records=new Map(),baselineEvidence=new Map()
 if(manifest.baselineZIP?.sha256!==acceptedZIP)findings.push({type:'accepted-baseline-identity',expected:acceptedZIP,actual:manifest.baselineZIP?.sha256})
 try{
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'qa/remediation-source/baseline-evidence.json'),'utf8'))
  if(evidence.zipSHA256!==acceptedZIP)throw Error('Historical evidence archive identity differs')
  for(const entry of evidence.entries||[]){const saved=fs.readFileSync(within(root,entry.file));if(sha(saved)!==entry.sha256)throw Error('Historical evidence byte hash mismatch: '+entry.file);baselineEvidence.set(entry.entry.replace(/^tq-bootstrap\//,''),saved)}
  for(const required of ['qa/results/colour-only-docs-source.json','qa/results/example-colour-substitutions.json','qa/results/docs-colour-substitutions.json','qa/results/inline-svg-colour-substitutions.json'])if(!baselineEvidence.has(required))throw Error('Missing accepted historical evidence: '+required)
 }catch(error){findings.push({type:'accepted-baseline-evidence',error:String(error)})}
 for(const entry of manifest.files||[]){
  const name=entry.file?.replaceAll('\\','/');let pass=true,detail={file:name,status:entry.status||'modified',beforeSHA256:entry.beforeSHA256,afterSHA256:entry.afterSHA256,edits:[],pass:false}
  try{
   const currentPath=within(root,name)
   if(records.has(name))throw Error('Duplicate reviewed source path')
   records.set(name,entry)
   const added=entry.status==='added'||entry.beforeSHA256===null,removed=entry.status==='removed'||entry.afterSHA256===null
   const before=added?Buffer.alloc(0):fs.readFileSync(within(root,entry.beforeFile))
   if(!added&&sha(before)!==entry.beforeSHA256)throw Error('Accepted before-file byte hash mismatch')
   if(added&&entry.beforeFile!=null)throw Error('Added files must have null beforeFile')
   const actual=removed?null:fs.readFileSync(currentPath)
   if(removed&&fs.existsSync(currentPath))throw Error('Reviewed deletion remains on disk')
   if(actual&&sha(actual)!==entry.afterSHA256)throw Error('Current file differs from reviewed after byte hash')
   if(entry.kind==='derived-preview'){
    const previews=JSON.parse(fs.readFileSync(path.join(root,'qa/results/example-previews.json'),'utf8'))
    const image=previews.images?.find(x=>x.path===name)
    if(!image||image.sha256!==entry.afterSHA256||previews.summary?.findings!==0||previews.summary?.images!==80||previews.summary?.pages!==40||previews.summary?.assetsFrozen!==true||previews.findings?.length||JSON.stringify(previews.assetsAtStart)!==JSON.stringify(previews.assetsAtEnd))throw Error('Derived preview lacks complete passing80-image capture provenance')
    const match=name.match(/^docs-source\/site\/static\/docs\/\[version\]\/example-previews\/([\w-]+?)(@2x)?\.png$/)
    const width=match?.[2]?960:480,height=match?.[2]?600:300
    if(!match||image.id!==match[1]||image.width!==width||image.height!==height||image.bytes!==actual.length||actual.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||actual.readUInt32BE(16)!==width||actual.readUInt32BE(20)!==height)throw Error('Derived preview path, density, PNG signature/dimensions or byte length differs')
    if(previews.scriptSHA256!==sha(fs.readFileSync(path.join(root,'scripts/build-example-previews.mjs'))))throw Error('Preview capture helper differs from recorded source')
    const source=previews.pages?.find(x=>x.id===image.id)
    if(source?.path!==image.sourceHTML?.path||source?.sha256!==image.sourceHTML?.sha256||previews.sourceInputHashes?.[source?.path]!==source?.sha256||sha(fs.readFileSync(within(root,source.path)))!==source.sha256)throw Error('Derived preview does not bind its current native example HTML')
    detail.derivedPreview={manifest:'qa/results/example-previews.json',sha256:sha(fs.readFileSync(path.join(root,'qa/results/example-previews.json'))),image:{id:image.id,density:image.density,sha256:image.sha256}}
   }else{
    let text=lf(before.toString('utf8'))
    if(!Array.isArray(entry.edits)||!entry.edits.length)throw Error('Reviewed text change has no exact edit pairs')
    for(const edit of entry.edits){
     if(typeof edit.before!=='string'||typeof edit.after!=='string'||!Number.isInteger(edit.count)||edit.count<1)throw Error('Invalid exact edit record')
     const from=lf(edit.before),to=lf(edit.after),count=from===''?(text===''?1:0):text.split(from).length-1
     const exact=count===edit.count
     detail.edits.push({count,expectedCount:edit.count,beforeSHA256:sha(from),afterSHA256:sha(to),reason:edit.reason,pass:exact})
     if(!exact)throw Error('Exact source-boundary count mismatch')
     text=from===''?to:text.split(from).join(to)
    }
    const transformed=removed?text==='':lf(actual.toString('utf8'))===text
    if(!transformed)throw Error('Text outside the reviewed paired edits changed')
    detail.normalizedTextTransformExact=true
    detail.currentLineEndings=actual?(/\r\n/.test(actual.toString())?'contains CRLF':'LF/no CRLF'):null
   }
   detail.beforeFromAcceptedZIP=entry.beforeFromAcceptedZIP||entry.baselineEntry||null
   detail.pass=true
  }catch(error){pass=false;detail.error=String(error);findings.push({type:'reviewed-remediation-boundary',file:name,error:String(error)})}
  checks.push(detail)
 }
 if(!Array.isArray(manifest.files)||!manifest.files.length)findings.push({type:'empty-remediation-source-inventory'})
 const acceptedBytes=name=>{name=name.replaceAll('\\','/');if(baselineEvidence.has(name))return baselineEvidence.get(name);const entry=records.get(name);if(entry){if(entry.beforeSHA256===null||entry.status==='added')return null;return fs.readFileSync(within(root,entry.beforeFile))}try{return fs.readFileSync(within(root,name))}catch{return null}}
 return {available:true,file,sha256:sha(bytes),manifest,checks,files:checks,findings,records,acceptedBytes,pass:findings.length===0}
}

export function auditDocumentationRemediation(root,proof=verifyRemediationManifest(root),{write=true}={}){
 const findings=[...proof.findings],historicalFile='qa/results/colour-only-docs-source.json'
 const reportBytes=proof.acceptedBytes?.(historicalFile),historical=reportBytes?JSON.parse(reportBytes):null
 if(historical?.status!=='pass'||historical.violations?.length)findings.push({type:'historical-pure-paint-source-audit-not-passing',file:historicalFile})
 const historicalFiles=[]
 for(const entry of historical?.files||[]){
  const file='docs-source/'+entry.path,accepted=proof.acceptedBytes(file),expected=entry.currentSha256??null,actual=accepted?sha(accepted):null
  const pass=actual===expected
  historicalFiles.push({file,expectedSHA256:expected,acceptedSHA256:actual,pass})
  if(!pass)findings.push({type:'accepted-source-differs-from-historical-proof',file,expected,actual})
 }
 const paint=[]
 for(const file of ['qa/results/example-colour-substitutions.json','qa/results/docs-colour-substitutions.json','qa/results/inline-svg-colour-substitutions.json']){
  const data=proof.acceptedBytes(file)
  if(!data){findings.push({type:'accepted-paint-manifest-missing',file});continue}
  const manifest=JSON.parse(data)
  for(const entry of manifest.files||[]){
   const native=fs.readFileSync(path.join(root,'upstream/bootstrap-source',entry.path)),accepted=proof.acceptedBytes('docs-source/'+entry.path)
   const verified=accepted?verifySubstitutions(native,accepted,entry):{pass:false,findings:['Accepted source absent']}
   paint.push({manifest:file,file:entry.path,...verified})
   if(!verified.pass)findings.push({type:'historical-native-to-accepted-paint-proof',file:entry.path,findings:verified.findings})
  }
 }
 const oldNames=new Set((historical?.files||[]).map(e=>'docs-source/'+e.path)),currentNames=[]
 function walk(relative){const absolute=path.join(root,relative);if(!fs.existsSync(absolute))return;for(const e of fs.readdirSync(absolute,{withFileTypes:true})){const file=relative+'/'+e.name;if(e.isDirectory())walk(file);else currentNames.push(file)}}
 for(const scope of ['site/src','site/data','site/static','scss','js','build'])walk('docs-source/'+scope)
 for(const name of ['site/astro.config.ts','site/postcss.config.cjs','site/tsconfig.json','site/.prettierrc.json','config.yml','package.json','package-lock.json','.browserslistrc','LICENSE','_tq-tokens.scss','README-TQ.md','build-tq-docs.mjs','audit-colour-only.mjs'])if(fs.existsSync(path.join(root,'docs-source',name)))currentNames.push('docs-source/'+name)
 for(const file of currentNames)if(!oldNames.has(file)&&!proof.records.has(file))findings.push({type:'unreviewed-current-source-addition',file})
 const sourceFingerprints={}
 for(const file of new Set([...currentNames,...(proof.checks||[]).filter(c=>c.afterSHA256).map(c=>c.file),'docs-source/audit-colour-only.mjs','qa/remediation/source-proof.mjs','qa/colour-substitution-proof.mjs','qa/remediation-source/manifest.json','qa/remediation-source/baseline-evidence.json']))if(fs.existsSync(path.join(root,file)))sourceFingerprints[file]=sha(fs.readFileSync(path.join(root,file)))
 const report={suite:'Explicit accessibility remediation source audit with preserved historical colour-only proof',finished:new Date().toISOString(),method:'Pin the accepted release identity. Verify each reviewed exact before/current byte hash and ordered paired text replacement. Reconstruct the accepted virtual documentation tree from saved before files, verify its every historical source hash, and replay original native-to-accepted paint manifests. Current non-colour changes are accepted only through exact reviewed source deltas; no paint/property/markup ignore is added.',status:findings.length?'fail':'pass',baselineZIP:proof.manifest?.baselineZIP,manifest:{file:proof.file,sha256:proof.sha256},historical:{file:historicalFile,sha256:reportBytes?sha(reportBytes):null,status:historical?.status,files:historicalFiles,paint},sourceFingerprints,remediation:proof.checks,findings,summary:{acceptedSourceFiles:historicalFiles.length,historicalHashFailures:historicalFiles.filter(r=>!r.pass).length,historicalPaintRecords:paint.length,historicalPaintFailures:paint.filter(r=>!r.pass).length,reviewedChanges:proof.checks.length,reviewedChangeFailures:proof.checks.filter(r=>!r.pass).length,unreviewedChanges:findings.filter(r=>r.type==='unreviewed-current-source-addition').length,findings:findings.length},limits:['This is exact source-change evidence, not a complete WCAG or runtime conformance assessment.','The separately recorded screenshots and browser tests verify the deliberate geometry/behaviour exceptions. Original Bootstrap JavaScript artifacts remain independently covered by package integrity.']}
 if(write){
  fs.mkdirSync(path.join(root,'qa/results'),{recursive:true});fs.mkdirSync(path.join(root,'docs-source/.cache'),{recursive:true})
  fs.writeFileSync(path.join(root,'qa/results/remediation-source.json'),JSON.stringify(report,null,2)+'\n')
  fs.writeFileSync(path.join(root,'docs-source/.cache/remediation-source-audit.json'),JSON.stringify(report,null,2)+'\n')
 }
 return report
}
