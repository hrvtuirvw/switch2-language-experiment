#!/usr/bin/env node
'use strict';
// One cleanup attempt per exact prior run. Prints START; never sends console input.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pairingCode,listen}=require('../engine/lib/connection.cjs');
const {NativeClient}=require('../engine/lib/native.cjs');
const {qualify}=require('../engine/lib/qualify.cjs');
const {serve}=require('../engine/lib/bridge.cjs');
const {chooseHost,connectCommand,sourceDigest,isPrivateIPv4}=require('../run.cjs');
const {createBootRecord}=require('../boot-journal.cjs');
const {plan}=require('./future-scratch-plan.cjs');
const pipeline=require('./cleanup-pipeline.cjs');
const {PINNED}=require('./live-clean.cjs');
const {verified:verifiedRecovery}=require('./verified-cleanup.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const check=(yes,why)=>{if(!yes)throw Error('Recovery: '+why)};
async function checkCleanupSources(){
 for(const [name,want] of Object.entries(PINNED)){
  const source=name==='app/filesystem.cjs'?path.join(__dirname,'filesystem-long.cjs'):
   path.resolve(__dirname,'../engine/switch2',name);
  const st=await fs.lstat(source);
  check(st.isFile()&&!st.isSymbolicLink()&&hash(await fs.readFile(source))===want,
   'isolated cleanup runtime changed: '+name);
 }
}
async function inspectRuns(root=path.resolve(__dirname,'../runs')){
 const stat=await fs.lstat(root).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 if(!stat)return [];
 check(stat.isDirectory()&&!stat.isSymbolicLink(),'runs is not a plain directory');
 const pending=[];
 for(const item of await fs.readdir(root,{withFileTypes:true})){
  if(!item.name.startsWith('switch2-'))continue;
  check(item.isDirectory()&&!item.isSymbolicLink()&&/^switch2-[A-Za-z0-9]{6}$/.test(item.name),
   'unknown run directory');
  const run=path.join(root,item.name),mem=path.join(run,'switch2/memory');
  const entries=await fs.readdir(mem).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e));
  const raws=entries.filter(n=>/^reserved-gap-[0-9]{13}\.json$/.test(n));
  check(raws.length<=1,'ambiguous raw report in '+item.name);
  if(!raws.length)continue;
  const rawFile=path.join(mem,raws[0]),producerFile=path.join(mem,'probe-reserved-gap.cjs');
  const rawStat=await fs.lstat(rawFile);check(rawStat.isFile()&&!rawStat.isSymbolicLink(),'linked raw');
  const bytes=await fs.readFile(rawFile),raw=JSON.parse(bytes);
  if(raw.cleanedUp===true||await verifiedRecovery(item.name,root))continue;
  check(raw.cleanedUp===false,'unknown cleanup state in '+item.name);
  const [resultBytes,pipeBytes]=await Promise.all([
   fs.readFile(path.join(run,'result.json')),fs.readFile(path.join(run,'switch2/pipeline.json'))]);
  const result=JSON.parse(resultBytes),report=JSON.parse(pipeBytes);
  check(result.verified===false&&result.platform===2&&report.session===item.name&&
   !report.trial&&!report.cleanup&&report.stages?.length===4&&
   report.stages.slice(0,3).every((s,i)=>s.name===['app/map','app/inspect-mounts','app/qualify'][i]&&s.status==='complete')&&
   report.stages[3].name==='FS read, write and restoration'&&report.stages[3].status==='failed',
   'prior run may have reached settings or lacks terminal FS-failure receipt: '+item.name);
  const rawSha256=hash(bytes);
  const owned=await plan({rawFile,producerFile,expectedRawSha256:rawSha256,expectedRun:item.name});
  check(owned.nodes.length===51&&owned.mayDelete===false,'not an exact 51-node source-owned tree');
  pending.push({priorRun:item.name,run,rawFile,producerFile,rawSha256,
   resultSha256:hash(resultBytes),pipelineSha256:hash(pipeBytes),root:owned.root,
   priorBootId:result.currentBoot?.bootId});
 }
 check(pending.length<=1,'multiple pending SAVE trees; no automatic selection');
 return pending;
}
function options(args){
 let run=false,bootId=null,peer=null,host=null;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--run'&&!run)run=true;
  else if(args[i]==='--check-only'&&!run&&args.length===1)return {run:false};
  else if(args[i]==='--boot-id'&&bootId===null)bootId=args[++i];
  else if(args[i]==='--peer-ip'&&peer===null)peer=args[++i];
  else if(args[i]==='--host-ip'&&host===null)host=args[++i];
  else throw Error('Usage: node recovery/recover-owned-save.cjs --check-only | --run --boot-id ID --peer-ip SWITCH_IP [--host-ip PC_IP]');
 }
 if(!run||!bootId||!isPrivateIPv4(peer)||host!==null&&!isPrivateIPv4(host))
  throw Error('Usage: node recovery/recover-owned-save.cjs --check-only | --run --boot-id ID --peer-ip SWITCH_IP [--host-ip PC_IP]');
 createBootRecord(bootId,'restore','ja');
 return {run,bootId,peer,host};
}
async function unchangedOriginal(o){
 const [raw,result,report]=await Promise.all([
  fs.readFile(o.rawFile),fs.readFile(path.join(o.run,'result.json')),
  fs.readFile(path.join(o.run,'switch2/pipeline.json'))]);
 return hash(raw)===o.rawSha256&&hash(result)===o.resultSha256&&
  hash(report)===o.pipelineSha256;
}
async function main(args=process.argv.slice(2),deps={}){
 const opts=options(args);await checkCleanupSources();
 const pending=await inspectRuns(deps.runsRoot);
 if(!pending.length){console.log('NO_PENDING_OWNED_SAVE_SCRATCH');return {pending:false}}
 const original=pending[0],workspace=path.resolve(__dirname,'../recovery-runs');
 const attempt=path.join(workspace,original.priorRun);
 const previous=await fs.lstat(attempt).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 check(!previous,'cleanup may have been attempted; preserve evidence, never retry START');
 const digest=await sourceDigest();
 if(!opts.run){console.log(JSON.stringify({pending:true,priorRun:original.priorRun,
  rawSha256:original.rawSha256,nodes:51,listenerOpened:false,cleanupPerformed:false}));return {pending:true}}
 check(process.stdin.isTTY,'run interactively after a distinct full OS boot and saved NS2 prep');
 check(opts.bootId!==original.priorBootId,'cleanup must use a different complete OS boot ID');
 const host=await (deps.chooseHost||chooseHost)(opts.host?[opts.host]:[]);
 // Recheck source and raw immediately before one-use admission.
 check((await inspectRuns(deps.runsRoot))[0]?.rawSha256===original.rawSha256&&
  await unchangedOriginal(original)&&
  await sourceDigest()===digest,'source or prior run changed before cleanup');
 await fs.mkdir(workspace,{recursive:true,mode:0o700});
 const state=await fs.lstat(workspace);check(state.isDirectory()&&!state.isSymbolicLink(),'linked recovery runs');
 await fs.mkdir(attempt,{mode:0o700}); // EEXIST is a hard stop, even if previous attempt produced no result.
 const admission={priorRun:original.priorRun,bootId:opts.bootId,rawSha256:original.rawSha256,
  resultSha256:original.resultSha256,pipelineSha256:original.pipelineSha256,
  sourceSha256:digest,attemptPossiblyAdmitted:true,started:new Date().toISOString()};
 await fs.writeFile(path.join(attempt,'boot.json'),JSON.stringify(admission,null,2)+'\n',{flag:'wx',mode:0o600});
 const directory=await fs.mkdtemp(path.join(attempt,'switch2-'));
 const token=pairingCode(),command=connectCommand(host,token);
 await fs.writeFile(path.join(directory,'connect.txt'),command+'\n',{flag:'wx',mode:0o600});
 const result={priorRun:original.priorRun,rawSha256:original.rawSha256,bootId:opts.bootId,
  sourceSha256:digest,cleanupOnly:true,languageWriteAttempted:false,verified:false,
  started:new Date().toISOString()};
 let native,bridge,failure;
 try{
  const connected=await (deps.listen||listen)({host,port:39380,token,timeout:900000,onWaiting(){
   console.log('Cleanup only. After a different complete OS boot and saved NS2 preparation,');
   console.log('stage this line, inspect it, then send Enter once. NEVER replay:');console.log('  '+command);
  }});
  const remote=connected.connection.socket.remoteAddress;
  check(remote===opts.peer||remote==='::ffff:'+opts.peer,'connecting Switch IP differs');
  native=new NativeClient(connected.connection,connected.addresses);
  result.bootstrap=await qualify(native);check(result.bootstrap?.verified===true,'bootstrap qualification failed');
  bridge=await serve(native);bridge.keepAwake(result.bootstrap.activity);
  await fs.writeFile(path.join(directory,'connection.json'),JSON.stringify({port:bridge.port,token:bridge.token,
   addresses:connected.addresses},null,2)+'\n',{flag:'wx',mode:0o600});
  for(const name of ['lib','shared','switch2'])
   await fs.cp(path.resolve(__dirname,'../engine',name),path.join(directory,name),{recursive:true});
  await fs.copyFile(path.join(__dirname,'filesystem-long.cjs'),path.join(directory,'switch2/app/filesystem.cjs'));
  check(hash(await fs.readFile(path.join(directory,'switch2/app/filesystem.cjs')))==='2044c2bdfe6ca027fcbfbcf60146de7595a2662c60640798e07097e75138e3cf',
   'isolated long-path helper changed');
  const bootProofSha256=hash(Buffer.from(JSON.stringify(admission)));
  const receipt=await (deps.pipeline||pipeline.main)({engineDir:path.join(directory,'switch2'),
   rawFile:original.rawFile,producerFile:original.producerFile,rawSha256:original.rawSha256,
   priorRun:original.priorRun,verifyBoot:async()=>({priorRun:original.priorRun,bootProofSha256,
    operatorAttestedFreshOsBoot:true,rebootVerified:false,sceneIndependentlyVerified:false,
    startUnusedAsOfPrep:true,liveSceneVerified:false}),
   liveWitness:async p=>p.bootProofSha256===bootProofSha256&&
    await unchangedOriginal(original)&&(await sourceDigest())===digest&&
    connected.connection.socket.remoteAddress===remote});
  check(receipt.verified===true&&receipt.cleanup?.removed===51&&
   receipt.cleanup.commitAcknowledged&&receipt.cleanup.freshSaveAbsenceVerified&&
   receipt.cleanup.sessionReleased,'cleanup receipt incomplete');
  result.cleanup=receipt.cleanup;result.pipelineReport=receipt.reportFile;result.verified=true;
 }catch(e){failure=e;result.error=e.stack}
 finally{
  for(const [name,stop] of [['bridge',()=>bridge?.close()],['connection',()=>native?.stop()]])
   try{await stop()}catch(e){(result.cleanupErrors||=[]).push({name,error:e.stack});failure||=e}
  if(failure)result.verified=false;
  result.completed=new Date().toISOString();
  await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 if(failure)throw Error(failure.message+'; preserve '+directory+' and never replay START');
 console.log('OWNED_SAVE_RECOVERY_VERIFIED',original.priorRun,'51 nodes, commit, fresh SAVE absence, session release');
 return {verified:true,runDirectory:directory};
}
module.exports={main,inspectRuns,options,checkCleanupSources};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
