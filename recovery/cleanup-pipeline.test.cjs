'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {main}=require('./cleanup-pipeline.cjs');
async function fixture(fn){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-cleanup-pipe-'));
 try{const engineDir=path.join(dir,'switch2-CLEAN1','switch2');await fs.mkdir(engineDir,{recursive:true});
  await fn(engineDir);}finally{await fs.rm(dir,{recursive:true,force:true})}}
test('cleanup pipeline runs map and mount inspection only, then verifies exact cleanup',async()=>fixture(async(engineDir)=>{
 const steps=[],runtime=name=>name==='../shared/rpc.cjs'?{a:{session:'switch2-CLEAN1',platform:2}}:
  {run:async(_directory,name)=>{steps.push(name);return {}}};
 const receipt={priorRun:'switch2-PRIOR1',rawSha256:'a'.repeat(64),cleanupOnly:true,
  removed:51,commitAcknowledged:true,freshSaveAbsenceVerified:true,sessionReleased:true};
 const result=await main({engineDir,priorRun:'switch2-PRIOR1',rawSha256:'a'.repeat(64),
  deps:{runtime:()=>runtime,recovery:async()=>{steps.push('exact-clean');return receipt}}});
 assert.equal(result.verified,true);assert.deepEqual(steps,['map','inspect-mounts','exact-clean']);
 const report=JSON.parse(await fs.readFile(result.reportFile));
 assert.equal(report.fsAcquisitionAttempted,false);assert.equal(report.languageWriteAttempted,false);
 assert.equal(report.stages.length,3);assert.equal(report.cleanup.removed,51);
}));
test('missing fresh SAVE proof cannot produce verified cleanup',async()=>fixture(async(engineDir)=>{
 const runtime=name=>name==='../shared/rpc.cjs'?{a:{session:'switch2-CLEAN1',platform:2}}:
  {run:async()=>null};
 await assert.rejects(main({engineDir,priorRun:'switch2-PRIOR1',rawSha256:'a'.repeat(64),
  deps:{runtime:()=>runtime,recovery:async()=>({priorRun:'switch2-PRIOR1',rawSha256:'a'.repeat(64),
   cleanupOnly:true,removed:51,commitAcknowledged:true,freshSaveAbsenceVerified:false,
   sessionReleased:true})}}),/new SAVE clone or session release unverified/);
 const report=JSON.parse(await fs.readFile(path.join(engineDir,'cleanup-pipeline.json')));
 assert.equal(report.verified,false);assert.equal(report.stages.at(-1).status,'failed');
}));
