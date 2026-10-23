import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ordered=map=>JSON.stringify(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)));
const names=process.argv.slice(2);
if(names.length<2)throw Error('Supply the complete raw report filenames from disjoint documentation-family runs.');
const runs=[];
for(const name of names){
 const file=path.posix.join('qa/results',name);
 const bytes=await fs.readFile(path.join(root,file));
 const report=JSON.parse(bytes);
 if(!report.finished||report.summary.failed!==0||report.summary.geometryMismatches!==0||!report.summary.assetsFrozen||report.checks.some(row=>row.pass!==true))throw Error('Incomplete or failing raw rendered run: '+file);
 if(report.parallelRuns||report.consolidation||report.postBuildColourRecheck)throw Error('Only original unmerged measurements may be combined.');
 if(ordered(report.assetsAtStart)!==ordered(report.assetsAtEnd))throw Error('Assets changed within '+file);
 runs.push({file,sha256:sha(bytes),report});
}
const first=runs[0].report;
const ids=new Set(),keys=new Set();
for(const {file,report}of runs){
 if(ordered(report.assetsAtStart)!==ordered(first.assetsAtStart))throw Error('Assets differ between raw runs: '+file);
 for(const row of report.coverage){if(ids.has(row.id))throw Error('Overlapping documentation family: '+row.id);ids.add(row.id);}
 for(const row of report.checks){const key=JSON.stringify([row.browser,row.id,row.width,row.theme,row.dir,row.state]);if(keys.has(key))throw Error('Duplicate measured case: '+key);keys.add(key);}
}
const combined={...first,started:runs.map(run=>run.report.started).sort()[0],finished:runs.map(run=>run.report.finished).sort().at(-1),checks:runs.flatMap(run=>run.report.checks),failures:[],geometryMismatches:[],screenshots:runs.flatMap(run=>run.report.screenshots),coverage:runs.flatMap(run=>run.report.coverage),assetsAtStart:first.assetsAtStart,assetsAtEnd:first.assetsAtEnd,parallelRuns:{method:'Disjoint documentation families tested independently on identical frozen assets. Rows are retained verbatim; no observed hashes or measurements are rebound.',reports:runs.map(({file,sha256})=>({file,sha256}))}};
combined.summary={checks:combined.checks.length,passed:combined.checks.length,failed:0,geometryMismatches:0,families:combined.coverage.length,nativeLiveExamples:combined.coverage.reduce((sum,row)=>sum+row.examples,0),assetsFrozen:true};
if(combined.summary.checks!==2274||combined.summary.families!==78||combined.summary.nativeLiveExamples!==598)throw Error('Combined coverage must be the complete original 2,274-case matrix.');
await fs.writeFile(path.join(root,'qa/results/colour-only-rendered.json'),JSON.stringify(combined,null,2)+'\n');
console.log(JSON.stringify(combined.summary,null,2));
