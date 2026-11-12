'use strict';
// Read-only verification of a temporary exact-peer rule owned by lan-listener.py.
// No boot journal, listener or START is admitted on this Linux host without it.
const fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net');
const {promisify}=require('node:util'),{execFile}=require('node:child_process');
const run=promisify(execFile);
const check=(ok,why)=>{if(!ok)throw Error('Host firewall: '+why)};
const privateIp=ip=>net.isIPv4(ip) && (ip.startsWith('10.') ||
  /^192\.168\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip));
const leaseDir=path.join(__dirname,'firewall-leases');
function fields(expr){
 const matches=(expr||[]).filter(x=>x.match).map(x=>x.match);
 const field=(kind,key)=>matches.find(m=>
  (m.left?.[kind]?.key===key||m.left?.[kind]?.field===key)&&m.op==='==')?.right;
 return {iface:field('meta','iifname'),peer:field('payload','saddr'),
  host:field('payload','daddr'),port:field('payload','dport'),
  accepted:(expr||[]).some(x=>x.accept===null||x.accept===true||x.accept?.type==='accept')};
}
function validate(lease,document,host,peer){
 check(lease?.state==='ACTIVE'&&lease.host===host&&lease.peer===peer&&
  privateIp(peer)&&privateIp(host)&&typeof lease.iface==='string'&&
  /^[a-zA-Z0-9_.-]{1,15}$/.test(lease.iface)&&lease.port===39380&&
  /^ns2-exact-[a-f0-9]{16}$/.test(lease.comment)&&
  Number.isInteger(lease.handle)&&Array.isArray(lease.baselineHandles)&&
  lease.baselineHandles.every(Number.isInteger),'exact lease receipt missing');
 const chain=document?.nftables?.find(x=>x.chain?.family==='ip'&&x.chain?.table==='filter'&&x.chain?.name==='INPUT')?.chain;
 check(chain?.policy==='drop','INPUT policy not proven');
 const rules=document.nftables.filter(x=>x.rule?.family==='ip'&&x.rule?.table==='filter'&&x.rule?.chain==='INPUT').map(x=>x.rule);
 check(rules.filter(x=>x.comment===lease.comment).length===1,'owned INPUT rule absent/ambiguous');
 const owned=rules.find(x=>x.comment===lease.comment),f=fields(owned.expr);
 check(owned.handle===lease.handle&&f.iface===lease.iface&&f.peer===peer&&f.host===host&&
  f.port===39380&&f.accepted,'exact peer/interface/destination/port rule differs');
 check(JSON.stringify(rules.filter(x=>x.handle!==lease.handle).map(x=>x.handle))===
  JSON.stringify(lease.baselineHandles),'unrelated INPUT rules changed');
 return true;
}
async function verify({host,peer,env=process.env,reader=fs,command=run}={}){
 if(process.platform!=='linux')return; // Non-Linux firewall remains the operator's responsibility.
 const file=env.NS2_FIREWALL_LEASE;
 check(typeof file==='string'&&/^([a-f0-9]{32})\.json$/.test(path.basename(file||''))&&
  path.dirname(file)===leaseDir,'launch via python3 lan-listener.py with the exact peer; no boot was consumed');
 const parent=await reader.lstat(leaseDir),stat=await reader.lstat(file);
 check(parent.isDirectory()&&!parent.isSymbolicLink()&&stat.isFile()&&!stat.isSymbolicLink(),
  'linked or missing lease receipt');
 const lease=JSON.parse(await reader.readFile(file,'utf8'));
 const {stdout}=await command('sudo',['-n','nft','-j','-a','list','chain','ip','filter','INPUT'],{timeout:12000});
 return validate(lease,JSON.parse(stdout),host,peer);
}
module.exports={verify,validate,fields};
