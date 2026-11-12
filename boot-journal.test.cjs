'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createBootRecord,consumeBoot}=require('./boot-journal.cjs');
const sha='a'.repeat(64);
async function fixture(fn){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-language-boot-'));
 try {await fn({dir,runs:path.join(dir,'runs')});}
 finally {await fs.rm(dir,{recursive:true,force:true});}}
test('operator boot ID is consumed atomically once, without an admission file',async()=>fixture(async({runs})=>{
 const boot=createBootRecord('new-os-boot-123456','english','en-US');
 await consumeBoot(runs,boot,sha);
 await assert.rejects(consumeBoot(runs,boot,sha),{code:'EEXIST'});
 const receipt=JSON.parse(await fs.readFile(path.join(runs,'boot-'+boot.bootId+'.json')));
 assert.equal(receipt.language,'en-US');assert.equal(receipt.sourceSha256,sha);
 assert.equal(Object.hasOwn(receipt,'admissionSha256'),false);
}));
test('invalid IDs, mode and language refuse before journal',async()=>fixture(async({runs})=>{
 for(const id of ['short','../not-a-boot-123456','boot 12345678901234567890','a'.repeat(65)])
  assert.throws(()=>createBootRecord(id,'english','en-US'),/boot ID/);
 assert.throws(()=>createBootRecord('new-os-boot-123456','invalid','en-US'),/mode/);
 assert.throws(()=>createBootRecord('new-os-boot-123456','restore','ko'),/Japanese/);
 assert.throws(()=>createBootRecord('new-os-boot-123456','english','ja'),/Japanese/);
 assert.throws(()=>createBootRecord('new-os-boot-123456','english','bad/path'),/language invalid/);
 await assert.rejects(consumeBoot(runs,{bootId:'../bad-boot-123456',mode:'english',language:'ko'},sha),/boot ID/);
 await assert.rejects(fs.stat(runs),{code:'ENOENT'});
}));
test('unresolved previous run blocks a different boot ID',async()=>fixture(async({runs})=>{
 await fs.mkdir(path.join(runs,'switch2-PRIOR1'),{recursive:true});
 const boot=createBootRecord('new-os-boot-123456','english','ko');
 await assert.rejects(consumeBoot(runs,boot,sha),/unresolved prior host run/);
 await assert.rejects(fs.stat(path.join(runs,'boot-'+boot.bootId+'.json')),{code:'ENOENT'});
}));
test('completed previous run permits distinct boot, but symlink in runs refuses',async()=>fixture(async({dir,runs})=>{
 const prior=path.join(runs,'switch2-PRIOR1');await fs.mkdir(prior,{recursive:true});
 await fs.writeFile(path.join(prior,'result.json'),JSON.stringify({verified:true,pipeline:{cleanup:{cleanedUp:true}}}));
 await consumeBoot(runs,createBootRecord('new-os-boot-123456','restore','ja'),sha);
 await fs.symlink(dir,path.join(runs,'foreign'));
 await assert.rejects(consumeBoot(runs,createBootRecord('new-os-boot-654321','english','fr'),sha),/symlink in runs/);
}));
