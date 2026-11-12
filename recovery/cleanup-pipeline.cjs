'use strict';
// Cleanup-only: app map, mount inspection, exact raw-bound SAVE removal.
// No FS acquisition/region/language IPC, no controller or START.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const recovery=require('./live-clean.cjs');
const check=(x,why)=>{if(!x)throw Error('cleanup pipeline: '+why)};
async function main({engineDir,rawFile,producerFile,rawSha256,priorRun,verifyBoot,liveWitness,
 deps={}}){
 check(path.isAbsolute(engineDir)&&path.basename(engineDir)==='switch2'&&
  /^switch2-[A-Za-z0-9]{6}$/.test(path.basename(path.dirname(engineDir)))&&
  /^switch2-[A-Za-z0-9]{6}$/.test(priorRun),'dedicated cleanup run required');
 const runtime=(deps.runtime||createRequire)(path.join(engineDir,'pipeline.cjs'));
 const {a}=runtime('../shared/rpc.cjs'),{run}=runtime('../shared/stages.cjs');
 check(a.session===path.basename(path.dirname(engineDir))&&a.platform===2,'cleanup RPC session mismatch');
 const file=path.join(engineDir,'cleanup-pipeline.json');
 const report={session:a.session,priorRun,cleanupOnly:true,fsAcquisitionAttempted:false,
  languageWriteAttempted:false,verified:false,started:new Date().toISOString(),stages:[]};
 await fs.writeFile(file,JSON.stringify(report)+'\n',{flag:'wx',mode:0o600});
 const save=()=>fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 async function step(name,action){const row={name,status:'running',started:new Date().toISOString()};
  report.stages.push(row);await save();
  try{row.result=await action();row.status='complete';return row.result}
  catch(e){row.status='failed';row.error=e.stack;throw e}
  finally{row.finished=new Date().toISOString();await save()}}
 try{
  await step('app/map',()=>run(path.join(engineDir,'app'),'map'));
  await step('app/inspect-mounts',()=>run(path.join(engineDir,'app'),'inspect-mounts'));
  const result=await step('exact-owned SAVE recovery and fresh clone',async()=>{
   const value=await (deps.recovery||recovery.main)({engineDir,rawFile,producerFile,rawSha256,
    priorRun,verifyBoot,liveWitness});
   check(value.priorRun===priorRun&&value.rawSha256===rawSha256&&
    value.cleanupOnly===true&&value.removed===51&&value.commitAcknowledged===true&&
    value.freshSaveAbsenceVerified===true&&value.sessionReleased===true,
    'cleanup/commit/new SAVE clone or session release unverified');
   return value;
  });
  report.cleanup=result;report.verified=true;
 }catch(e){report.error=e.stack;throw e}
 finally{report.finished=new Date().toISOString();await save()}
 return {reportFile:file,verified:true,cleanup:report.cleanup};
}
module.exports={main};
