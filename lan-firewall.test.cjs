'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate,verify,choosePeer,supervise}=require('./lan-firewall.cjs');
const {EventEmitter}=require('node:events');
const peer='192.168.56.21',host='192.168.56.24';
const lease={state:'ACTIVE',peer,host,iface:'enp5s0',port:39380,
 comment:'ns2-exact-0123456789abcdef',handle:34,baselineHandles:[20,21,22,23,24,25]};
const match=(kind,key,right)=>({match:{left:{[kind]:kind==='payload'?{protocol:key==='dport'?'tcp':'ip',field:key}:{key}},op:'==',right}});
const rule={family:'ip',table:'filter',chain:'INPUT',handle:34,comment:lease.comment,
 expr:[match('meta','iifname',lease.iface),match('payload','saddr',peer),
  match('payload','daddr',host),match('payload','dport',39380),{accept:null}]};
const doc={nftables:[{chain:{family:'ip',table:'filter',name:'INPUT',policy:'drop'}},
 ...lease.baselineHandles.map(handle=>({rule:{family:'ip',table:'filter',chain:'INPUT',handle}})),{rule}]};
test('exact private-peer, interface and port rule with unchanged INPUT baseline admits',()=>{
 assert.equal(validate(lease,doc,host,peer),true);
});
test('wrong peer/destination/port/accept and unrelated INPUT delta fail closed',()=>{
 for(const mutation of [
  d=>{d.nftables.at(-1).rule.expr[1].match.right='192.168.56.22'},
  d=>{d.nftables.at(-1).rule.expr[2].match.right='192.168.56.25'},
  d=>{d.nftables.at(-1).rule.expr[3].match.right=39381},
  d=>{d.nftables.at(-1).rule.expr.pop()},
  d=>{d.nftables.splice(1,1)},
  d=>{d.nftables[0].chain.policy='accept'},
  d=>{d.nftables.at(-1).rule.comment='foreign'}]){
  const changed=structuredClone(doc);mutation(changed);
  assert.throws(()=>validate(lease,changed,host,peer),/Host firewall:/);
 }
 assert.throws(()=>validate({...lease,peer:'8.8.8.8'},doc,host,'8.8.8.8'),/Host firewall:/);
});
test('missing supervisor lease refuses before any firewall command',async()=>{
 await assert.rejects(verify({host,peer,env:{},command:async()=>{throw Error('must not call nft')}}),
  /temporary exact-peer lease missing/);
});
test('peer selection validates explicit address and does not silently guess',async()=>{
 assert.equal(await choosePeer(peer),peer);
 await assert.rejects(choosePeer(null,{input:{isTTY:false}}),/provide --peer-ip/);
 for(const invalid of ['8.8.8.8','127.0.0.1','0.0.0.0','not-an-ip'])
  await assert.rejects(choosePeer(invalid),/private Switch 2 LAN IPv4/);
});
test('direct runner launches the exact supervisor and forwards interruption',async()=>{
 if(process.platform!=='linux')return;
 const signals=new EventEmitter(),child=new EventEmitter();let sent=null,captured=null;
 child.kill=signal=>{sent=signal;return true};
 const launch=(bin,args,opts)=>{captured={bin,args,opts};
  queueMicrotask(()=>{signals.emit('SIGINT');child.emit('close',1,null)});return child};
 await assert.rejects(supervise({host,peer,command:['set-language.cjs','--language','ko',
  '--boot-id','fresh-boot-123456',host],launch,signals}),/supervised run stopped/);
 assert.equal(captured.bin,'python3');assert.equal(captured.args[1],'--peer-ip');
 assert.deepEqual(captured.args.slice(-6),['set-language.cjs','--language','ko',
  '--boot-id','fresh-boot-123456',host]);
 assert.equal(captured.opts.env.NS2_FIREWALL_LEASE,'');assert.equal(sent,'SIGINT');
 assert.equal(signals.listenerCount('SIGINT'),0);
});
