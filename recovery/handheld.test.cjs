'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {inspectRuns,options,main}=require('./handheld.cjs');
const {PRODUCER_SHA}=require('./future-scratch-plan.cjs');
const {verified}=require('./verified-cleanup.cjs');
const crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const run='switch2-TEST01',root='/NS2_GAP_1800999999999',segments=['S0_1800999999998','S1_1800999999998','S2_1800999999998'];
async function fixture(fn){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-cleanup-'));
 try{const runs=path.join(temp,'runs'),mem=path.join(runs,run,'switch2/memory');await fs.mkdir(mem,{recursive:true});
  const canary=root+'/canary'+('/'+'A'.repeat(32)).repeat(42)+'/'+'A'.repeat(24);
  const parts=canary.slice(1).split('/'),marker=root+'/'+segments.join('/');
  const createdNodes=[{path:root,type:0},{path:root+'/commit_data',type:1},
   ...parts.slice(1).map((_,i)=>({path:'/'+parts.slice(0,i+2).join('/'),type:i===parts.length-2?1:0})),
   {path:root+'/selected',type:0},...segments.map((_,i)=>({path:root+'/'+segments.slice(0,i+1).join('/'),type:0})),
   {path:marker+'/SPAN_MARKER',type:1}];
  const raw={session:run,scratch:root,canary,markerSegments:segments,createdNodes,
   cleanedUp:false,qualifiedReadSize:0x180000,recoveryRequired:{scratch:root,nonrecursiveOnly:true,mounts:['save']},
   retained:{cacheNeedsRestore:false,released:true,threads:[],handles:[],
    workers:Array.from({length:13},()=>({joined:true})),created:[{name:'save',path:root}]}};
  const rawFile=path.join(mem,'reserved-gap-1800999999999.json');
  await fs.writeFile(rawFile,JSON.stringify(raw));
  await fs.copyFile(path.resolve(__dirname,'../engine/switch2/memory/probe-reserved-gap.cjs'),path.join(mem,'probe-reserved-gap.cjs'));
  assert.equal(PRODUCER_SHA,require('node:crypto').createHash('sha256').update(await fs.readFile(path.join(mem,'probe-reserved-gap.cjs'))).digest('hex'));
  await fs.writeFile(path.join(runs,run,'result.json'),JSON.stringify({platform:2,verified:false,currentBoot:{bootId:'old-boot-123456789'},sourceSha256:'a'.repeat(64)}));
  const pipeline={session:run,stages:['app/map','app/inspect-mounts','app/qualify','FS read, write and restoration'].map((name,i)=>({name,status:i===3?'failed':'complete'}))};
  await fs.writeFile(path.join(runs,run,'switch2/pipeline.json'),JSON.stringify(pipeline));
  await fn({runs,rawFile,raw,root:temp});
 }finally{await fs.rm(temp,{recursive:true,force:true})}}
test('one exact pre-language owned tree is selected; no console or journal in check-only',async()=>fixture(async({runs})=>{
 const pending=await inspectRuns(runs);assert.equal(pending.length,1);assert.equal(pending[0].priorRun,run);
 assert.equal(pending[0].priorBootId,'old-boot-123456789');
 assert.deepEqual(await main(['--check-only'],{runsRoot:runs}),{pending:true});
}));
test('wrong raw ownership, post-FS stage or multiple pending trees refuse',async()=>fixture(async({runs,rawFile,raw})=>{
 await fs.writeFile(rawFile,JSON.stringify({...raw,createdNodes:[]}));
 await assert.rejects(inspectRuns(runs),/exact owned tree differs/);
 await fs.writeFile(rawFile,JSON.stringify(raw));
 const p=path.join(runs,run,'switch2/pipeline.json');const obj=JSON.parse(await fs.readFile(p));obj.stages.push({name:'ro/region-language-roundtrip',status:'complete'});
 await fs.writeFile(p,JSON.stringify(obj));await assert.rejects(inspectRuns(runs),/may have reached settings/);
}));
test('CLI requires one-use boot ID, private peer and valid mode',()=>{
 assert.deepEqual(options(['--check-only']),{run:false});
 assert.equal(options(['--run','--boot-id','fresh-boot-123456','--peer-ip','192.168.0.21']).peer,'192.168.0.21');
 for(const args of [['--run'],['--run','--boot-id','bad','--peer-ip','192.168.0.21'],
   ['--run','--boot-id','fresh-boot-123456','--peer-ip','8.8.8.8'],['--check-only','--run'],
   ['--run','--boot-id','fresh-boot-123456','--peer-ip','192.168.0.21','--host-ip','0.0.0.0']])
  assert.throws(()=>options(args));
});
test('complete exact cleanup journal unlocks the next boot; tampering refuses',async()=>fixture(async({runs,rawFile,root:tmp})=>{
 const plan=await require('./future-scratch-plan.cjs').plan({rawFile,
  producerFile:path.join(path.dirname(rawFile),'probe-reserved-gap.cjs'),
  expectedRawSha256:digest(await fs.readFile(rawFile)),expectedRun:run});
 const attempt=path.join(tmp,'recovery-runs',run),dir=path.join(attempt,'switch2-CLEAN1'),
  reportFile=path.join(dir,'switch2/cleanup-pipeline.json'),
  journalFile=path.join(dir,'switch2/future-exact-clean/journal.jsonl');
 await fs.mkdir(path.dirname(journalFile),{recursive:true});
 const rawSha256=digest(await fs.readFile(rawFile)),sourceSha256='b'.repeat(64),
  clean={priorRun:run,rawSha256,removed:51,commitAcknowledged:true,
   freshSaveAbsenceVerified:true,sessionReleased:true,journalFile};
 await fs.writeFile(path.join(attempt,'boot.json'),JSON.stringify({priorRun:run,bootId:'fresh-boot-123456',
  rawSha256,sourceSha256,attemptPossiblyAdmitted:true,
  resultSha256:digest(await fs.readFile(path.join(runs,run,'result.json'))),
  pipelineSha256:digest(await fs.readFile(path.join(runs,run,'switch2/pipeline.json')))}));
 await fs.writeFile(reportFile,JSON.stringify({verified:true,cleanupOnly:true,fsAcquisitionAttempted:false,
  languageWriteAttempted:false,priorRun:run,cleanup:clean}));
 await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({verified:true,cleanupOnly:true,
  languageWriteAttempted:false,priorRun:run,rawSha256,sourceSha256,bootId:'fresh-boot-123456',
  cleanup:clean,pipelineReport:reportFile}));
 const events=[...plan.nodes.slice(1).map(n=>({phase:'REMOVED_ACK',path:n.path})),
  {phase:'ROOT_POSSIBLY_ADMITTED',path:plan.root},
  {phase:'COMMITTED',root:plan.root,rawSha256},
  {phase:'FRESH_CLONE_ROOT',result:0x202,canonicalResult:0x202},
  {phase:'SESSION_RELEASED',released:true}];
 await fs.writeFile(journalFile,events.map(x=>JSON.stringify(x)).join('\n')+'\n');
 assert.equal(await verified(run,runs),true);assert.deepEqual(await inspectRuns(runs),[]);
 await require('../boot-journal.cjs').consumeBoot(runs,
  require('../boot-journal.cjs').createBootRecord('next-os-boot-123456','english','ko'),'c'.repeat(64));
 await fs.writeFile(journalFile,events.slice(1).map(x=>JSON.stringify(x)).join('\n')+'\n');
 await assert.rejects(verified(run,runs),/journal incomplete/);
 await assert.rejects(require('../boot-journal.cjs').consumeBoot(runs,
  require('../boot-journal.cjs').createBootRecord('another-boot-123456','english','fr'),'c'.repeat(64)),
  /journal incomplete/);
}));
