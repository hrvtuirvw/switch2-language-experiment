'use strict';
// An operator-supplied boot ID prevents accidental reuse of the same ID;
// it is not a measurement of the console's OS boot or SAVE state.
// Fail closed after any uncertain host attempt. Never infer scratch absence from a prefix.
const fs=require('node:fs/promises'),path=require('node:path');
const check=(condition,message)=>{if(!condition)throw Error('Boot journal: '+message)};
function createBootRecord(bootId,mode,language){
 check(typeof bootId==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(bootId),
  'unique boot ID must be 16–64 ASCII letters/digits/_/-');
 check(mode==='english'||mode==='restore','mode invalid');
 check(typeof language==='string'&&/^[a-zA-Z0-9-]{2,16}$/.test(language),
  'language invalid');
 check(mode!=='restore'||language==='ja','restore target must be Japanese');
 check(mode!=='english'||language!=='ja','forward target must not be Japanese');
 return {bootId,mode,language};
}
async function consumeBoot(runs,boot,sourceSha256,reader=fs){
 createBootRecord(boot.bootId,boot.mode,boot.language);
 check(/^[a-f0-9]{64}$/.test(sourceSha256),'source hash invalid');
 await reader.mkdir(runs,{recursive:true,mode:0o700});
 const stats=await reader.lstat(runs);
 check(stats.isDirectory()&&!stats.isSymbolicLink(),'runs is not a plain directory');
 for(const entry of await reader.readdir(runs,{withFileTypes:true})){
  check(!entry.isSymbolicLink(),'symlink in runs: '+entry.name);
  if(!entry.isDirectory()){
   check(entry.isFile()&&/^boot-[a-zA-Z0-9_-]{16,64}\.json$/.test(entry.name),
    'unknown file in runs: '+entry.name);
   continue;
  }
  check(/^switch2-[a-zA-Z0-9_-]+$/.test(entry.name),'unknown directory in runs: '+entry.name);
  const result=path.join(runs,entry.name,'result.json');
  const prior=await reader.readFile(result,'utf8').then(JSON.parse).catch(()=>null);
  check(prior?.verified===true&&prior?.pipeline?.cleanup?.cleanedUp===true,
   'unresolved prior host run '+entry.name+'; preserve it and perform exact-owned recovery first');
 }
 const receipt=path.join(runs,'boot-'+boot.bootId+'.json');
 const record={bootId:boot.bootId,mode:boot.mode,language:boot.language,
  sourceSha256,attemptPossiblyAdmitted:true,started:new Date().toISOString(),
  warning:'Boot identity is operator-supplied, not independently verified. Do not retry same boot.'};
 await reader.writeFile(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
 return receipt;
}
module.exports={createBootRecord,consumeBoot};
