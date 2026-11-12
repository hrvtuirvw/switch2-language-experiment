'use strict';
// Future-run SAVE recovery stage only. Never run on the acquisition boot.
// Handheld mode has no HDMI. The caller supplies a one-use operator-attested
// full-OS-reboot/NS2/START0 proof and an immediate peer/lease witness.
// Do not describe operator testimony as independently verified scene evidence.
const fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');
const crypto=require('node:crypto');
const planner=require('./future-scratch-plan.cjs');
const cleaner=require('./future-scratch-clean.cjs');
const {makeAdapter}=require('./future-mounted-save-adapter.cjs');
const PINNED={
 'app/filesystem.cjs':'2044c2bdfe6ca027fcbfbcf60146de7595a2662c60640798e07097e75138e3cf',
 'app/mounted-save.cjs':'fdf76f2ff460f344ace7d5c08fcf30fadb87b6f5ef321622438cc0cf31254c08',
 'memory/paths.cjs':'67206c9d6a2fcc533f2db89e1c8f23c9a2e557d7e61b97483c4c4a2f98be66b3'};
const check=(yes,why)=>{if(!yes)throw Error('future live recovery: '+why)};
async function main({engineDir,rawFile,rawSha256,producerFile,priorRun,verifyBoot,liveWitness,
 deps={}}){
 check(path.isAbsolute(engineDir)&&path.basename(engineDir)==='switch2'&&
  /^switch2-[A-Za-z0-9]{6}$/.test(path.basename(path.dirname(engineDir)))&&
  /^switch2-[A-Za-z0-9]{6}$/.test(priorRun)&&priorRun!==path.basename(path.dirname(engineDir)),
  'separate exact runtime required');
 check(typeof verifyBoot==='function'&&typeof liveWitness==='function',
  'one-use reboot attestation and current peer/lease witness required');
 const proof=await verifyBoot();
 check(proof?.operatorAttestedFreshOsBoot===true&&proof?.rebootVerified===false&&
  proof?.sceneIndependentlyVerified===false&&proof?.startUnusedAsOfPrep===true&&
  proof?.priorRun===priorRun&&proof?.liveSceneVerified===false&&
  /^[a-f0-9]{64}$/.test(proof?.bootProofSha256||''),
  'one-use operator-attested later-boot receipt must bind the source run');
 check(await liveWitness(proof)===true,'live handheld peer/lease witness missing');
 const plan=await (deps.plan||planner.plan)({rawFile,expectedRawSha256:rawSha256,
  producerFile,expectedRun:priorRun});
 check(plan?.run===priorRun&&plan?.rawSha256===rawSha256,
  'raw/producer run binding failed');
 for(const [name,digest] of Object.entries(PINNED)){
  const file=path.join(engineDir,name),stat=await fs.lstat(file);
  check(stat.isFile()&&!stat.isSymbolicLink()&&
   crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')===digest,
   'mounted SAVE/long path helper differs: '+name);
 }
 const runtime=(deps.runtime||createRequire)(path.join(engineDir,'app/session.cjs'));
 const {Session,live}=runtime('./session.cjs'),mounted=runtime('./mounted-save.cjs');
 const filesystem=runtime('./filesystem.cjs'),domain=runtime('./domain.cjs');
 const {paths}=runtime('../memory/paths.cjs');
 const dir=path.join(engineDir,'future-exact-clean');await fs.mkdir(dir,{mode:0o700});
 const journalFile=path.join(dir,'journal.jsonl'),journal=await fs.open(journalFile,'wx',0o600);
 let session, result, failure;
 try{
  const entry=async event=>{await journal.writeFile(JSON.stringify({at:new Date().toISOString(),
   session:live.session,priorRun,rawSha256,bootProofSha256:proof.bootProofSha256,...event})+'\n');
   await journal.sync()};
  await entry({phase:'BEGIN',root:plan.root});
  session=new Session('future-clean-exact-save',0x50000);await session.initialize();
  const handle=await mounted.cloneMountedFilesystem(session,'save');
  const {normal}=paths(session,domain),adapter=(deps.makeAdapter||makeAdapter)(session,handle,
   filesystem,normal,plan);
  await entry({phase:'SAVE_CLONED',root:plan.root});
  result=await (deps.clean||cleaner.clean)(adapter,plan,entry);
  await entry({phase:'REMOVAL_AND_COMMIT_ACK',...result});
  const clone=await mounted.cloneMountedFilesystem(session,'save');
  const fresh=await normal(clone,7,plan.root);
  await entry({phase:'FRESH_CLONE_ROOT',result:fresh.result,canonicalResult:fresh.canonicalResult});
  check(fresh.result===0x202&&fresh.canonicalResult===0x202,
   'fresh SAVE clone did not prove root absence');
  result={...result,freshSaveAbsenceVerified:true};
 }catch(e){failure=e}
 finally{
  if(session)try{await session.cleanup();await journal.writeFile(JSON.stringify({phase:'SESSION_RELEASED',
   at:new Date().toISOString(),released:!session.base&&!session.handles.size&&!session.threads.size})+'\n');
   await journal.sync()}catch(e){failure||=e}
  await journal.close();
 }
 if(failure)throw failure;
 check(!session.base&&!session.handles.size&&!session.threads.size,'session resources retained');
 return {priorRun,rawSha256,bootProofSha256:proof.bootProofSha256,cleanupOnly:true,
  removed:result.removed,commitAcknowledged:result.commitAcknowledged,
  freshSaveAbsenceVerified:result.freshSaveAbsenceVerified,sessionReleased:true,journalFile};
}
module.exports={main,PINNED};
