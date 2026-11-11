'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs/promises'), os=require('node:os'), path=require('node:path');
const {promisify}=require('node:util'), {execFile}=require('node:child_process');
const invoke=promisify(execFile);
const {dialogArgs,chooseLanguage}=require('./language-dialog.cjs');
const {CODES,byCode}=require('./engine/switch2/ro/language-codes.cjs');
const {main}=require('./run.cjs');

test('dialog lists all 17 unique forward targets; ja is restore-only',()=>{
 const args=dialogArgs(), rows=args.slice(args.indexOf('--print-column=3')+1);
 assert.equal(rows.length,17*3);
 assert.deepEqual(rows.filter((_,i)=>i%3===2),CODES.filter(code=>code!=='ja'));
 assert.deepEqual(rows.filter((_,i)=>i%3===0),['TRUE',...Array(16).fill('FALSE')]);
 assert.ok(rows.filter((_,i)=>i%3===1).every(label=>label.length>0));
 assert.equal(args.includes('--print-column=3'),true);
});
test('dialog returns canonical code, and its executable/arguments never use a shell',async()=>{
 let calls=0;
 const chosen=await chooseLanguage(async(file,args,options)=>{
  calls++;assert.equal(file,'zenity');assert.deepEqual(args,dialogArgs());
  assert.equal(options.timeout,600000);assert.equal(options.maxBuffer,8192);
  return {stdout:'ko\n'};
 });
 assert.deepEqual(chosen,byCode('ko'));assert.equal(calls,1);
});
test('cancel, unavailable, timeout, empty, ja and malformed choices fail closed',async()=>{
 for(const failure of [Object.assign(Error('cancel'),{code:1}),
   Object.assign(Error('missing'),{code:'ENOENT'}),
   Object.assign(Error('timeout'),{killed:true})])
  await assert.rejects(chooseLanguage(async()=>{throw failure}),/did not consume a boot/);
 for(const stdout of ['', 'ja\n', 'KO\n', 'en-US\nfr\n','zh-CN\n','zh-TW\n','never-heard-of'])
  await assert.rejects(chooseLanguage(async()=>({stdout})),/invalid choice/);
});
test('main chooses before admission/boot; explicit language, restore and check-only bypass UI',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-dialog-test-'));
 try {
  const bootId='dialog-test-'+Math.random().toString(36).slice(2).padEnd(18,'a');
  const file=path.join(dir,'admission.json');
  const base={bootId,mode:'english',confirmedFreshOsBoot:true,
    confirmedNoPendingOwnedScratch:true,confirmedSavedNs2:true,confirmedStartUnused:true};
  const bootReceipt=path.join(__dirname,'runs','boot-'+bootId+'.json');
  const missing=()=>fs.stat(bootReceipt).then(()=>false,error=>error.code==='ENOENT');
  assert.equal(await missing(),true);
  let calls=0;
  const cancel=async()=>{calls++;throw Error('dialog cancelled')};
  await assert.rejects(main(['--mode','english','--admission',file],{pickLanguage:cancel}),/dialog cancelled/);
  assert.equal(calls,1);assert.equal(await missing(),true);
  await fs.writeFile(file,JSON.stringify(base));
  await assert.rejects(main(['--mode','english','--language','ko','--admission',file],
    {pickLanguage:cancel}),/language target mismatch/);
  assert.equal(calls,1);assert.equal(await missing(),true);
  for(const legacy of ['zh-CN','zh-TW']){
    await assert.rejects(main(['--mode','english','--language',legacy,'--admission',file],
      {pickLanguage:cancel}),/Unsupported language code/);
    assert.equal(await missing(),true);
  }
  await fs.writeFile(file,JSON.stringify({...base,language:'ko'}));
  await assert.rejects(main(['--mode','english','--admission',file,'198.51.100.23'],
    {pickLanguage:async()=>{calls++;return byCode('ko')}}),/not an active local LAN address/);
  assert.equal(calls,2);assert.equal(await missing(),true);
  await assert.rejects(main(['--mode','english','--language','ko','--admission',file,'198.51.100.23'],
    {pickLanguage:cancel}),/not an active local LAN address/);
  assert.equal(calls,2);assert.equal(await missing(),true);
  await assert.rejects(main(['--mode','restore','--admission',file],{pickLanguage:cancel}),/mode mismatch/);
  assert.equal(calls,2);assert.equal(await missing(),true);
  const check=await main(['--check-only'],{pickLanguage:cancel});
  assert.equal(check.checkedOnly,true);assert.equal(calls,2);assert.equal(await missing(),true);
 } finally {await fs.rm(dir,{recursive:true,force:true})}
});
test('real CLI wrappers: dialog cancel precedes admission; argument, English alias and restore bypass dialog',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ns2-dialog-cli-'));
 try {
  const marker=path.join(dir,'dialog-called');
  const executable=path.join(dir,'zenity');
  await fs.writeFile(executable,'#!/bin/sh\nprintf called > "$DIALOG_TEST_MARKER"\nexit 1\n',{mode:0o700});
  const env={...process.env,PATH:dir+path.delimiter+process.env.PATH,DIALOG_TEST_MARKER:marker};
  const admission=path.join(dir,'missing-admission.json');
  const cli=(file,args)=>invoke(process.execPath,[path.join(__dirname,file),...args],
    {cwd:__dirname,env,timeout:15000});
  await assert.rejects(cli('set-language.cjs',['--admission',admission]),
    error=>/selection cancelled, unavailable or timed out/.test(error.stderr));
  assert.equal(await fs.readFile(marker,'utf8'),'called');
  await fs.unlink(marker);
  for(const [file,args] of [
    ['set-language.cjs',['--language','ko','--admission',admission]],
    ['enable-english.cjs',['--admission',admission]],
    ['restore-japanese.cjs',['--admission',admission]]]) {
    await assert.rejects(cli(file,args),error=>!error.stderr.includes('selection cancelled'));
    await assert.rejects(fs.stat(marker),{code:'ENOENT'});
  }
 } finally {await fs.rm(dir,{recursive:true,force:true})}
});
