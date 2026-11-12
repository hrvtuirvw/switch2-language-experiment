'use strict';
// Read-only proof that this source's distinct cleanup attempt acknowledged the
// exact tree, commit, fresh SAVE clone absence, and session release.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {plan}=require('./future-scratch-plan.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const check=(ok,why)=>{if(!ok)throw Error('Recovery proof: '+why)};
async function verified(priorRun,runs=path.resolve(__dirname,'../runs')){
 check(/^switch2-[A-Za-z0-9]{6}$/.test(priorRun),'run name invalid');
 const recoveryRoot=path.resolve(runs,'../recovery-runs');
 const parent=await fs.lstat(recoveryRoot).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 if(!parent)return false;
 check(parent.isDirectory()&&!parent.isSymbolicLink(),'linked recovery root');
 const attempt=path.join(recoveryRoot,priorRun),stat=await fs.lstat(attempt).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 if(!stat)return false;
 check(stat.isDirectory()&&!stat.isSymbolicLink(),'linked cleanup attempt');
 const boot=JSON.parse(await fs.readFile(path.join(attempt,'boot.json')));
 check(boot.priorRun===priorRun&&boot.attemptPossiblyAdmitted===true&&
  /^[a-f0-9]{64}$/.test(boot.rawSha256)&&/^[a-f0-9]{64}$/.test(boot.sourceSha256),
  'uncertain cleanup admission');
 const entries=await fs.readdir(attempt,{withFileTypes:true});
 const cleanup=entries.filter(x=>x.isDirectory()&&/^switch2-[A-Za-z0-9]{6}$/.test(x.name));
 check(cleanup.length===1&&entries.length===2&&entries.every(x=>!x.isSymbolicLink()),
  'incomplete/ambiguous cleanup attempt');
 const dir=path.join(attempt,cleanup[0].name),summary=JSON.parse(await fs.readFile(path.join(dir,'result.json')));
 check(summary.verified===true&&summary.cleanupOnly===true&&summary.languageWriteAttempted===false&&
  summary.priorRun===priorRun&&summary.rawSha256===boot.rawSha256&&
  summary.sourceSha256===boot.sourceSha256&&summary.bootId===boot.bootId&&
  summary.cleanup?.removed===51&&summary.cleanup?.commitAcknowledged===true&&
  summary.cleanup?.freshSaveAbsenceVerified===true&&summary.cleanup?.sessionReleased===true&&
  !summary.cleanupErrors?.length,'cleanup did not fully verify');
 const original=path.join(runs,priorRun),mem=path.join(original,'switch2/memory');
 const raws=(await fs.readdir(mem)).filter(n=>/^reserved-gap-[0-9]{13}\.json$/.test(n));
 check(raws.length===1,'original raw ambiguous');
 const rawFile=path.join(mem,raws[0]),producerFile=path.join(mem,'probe-reserved-gap.cjs');
 check(hash(await fs.readFile(rawFile))===boot.rawSha256&&
  hash(await fs.readFile(path.join(original,'result.json')))===boot.resultSha256&&
  hash(await fs.readFile(path.join(original,'switch2/pipeline.json')))===boot.pipelineSha256,
  'prior run changed since cleanup');
 const owned=await plan({rawFile,producerFile,expectedRawSha256:boot.rawSha256,expectedRun:priorRun});
 const reportFile=path.join(dir,'switch2/cleanup-pipeline.json');
 check(summary.pipelineReport===reportFile,'cleanup pipeline path differs');
 const report=JSON.parse(await fs.readFile(reportFile));
 check(report.verified===true&&report.cleanupOnly===true&&
  report.fsAcquisitionAttempted===false&&report.languageWriteAttempted===false&&
  report.priorRun===priorRun&&report.cleanup?.rawSha256===boot.rawSha256&&
  report.cleanup?.removed===51&&report.cleanup?.commitAcknowledged===true&&
  report.cleanup?.freshSaveAbsenceVerified===true&&report.cleanup?.sessionReleased===true,
  'cleanup pipeline differs');
 const journalFile=path.join(dir,'switch2/future-exact-clean/journal.jsonl');
 check(summary.cleanup.journalFile===journalFile,'cleanup journal path differs');
 const lines=(await fs.readFile(journalFile,'utf8')).trim().split('\n').map(JSON.parse);
 const acknowledged=lines.filter(x=>x.phase==='REMOVED_ACK').map(x=>x.path);
 check(acknowledged.length===50&&new Set(acknowledged).size===50&&
  owned.nodes.slice(1).every(n=>acknowledged.includes(n.path))&&
  lines.some(x=>x.phase==='ROOT_POSSIBLY_ADMITTED'&&x.path===owned.root)&&
  lines.some(x=>x.phase==='COMMITTED'&&x.root===owned.root&&x.rawSha256===boot.rawSha256)&&
  lines.some(x=>x.phase==='FRESH_CLONE_ROOT'&&x.result===0x202&&x.canonicalResult===0x202)&&
  lines.some(x=>x.phase==='SESSION_RELEASED'&&x.released===true),
  'owned removals/commit/fresh absence/release journal incomplete');
 return true;
}
module.exports={verified};
