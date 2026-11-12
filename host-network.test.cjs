'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {addresses,isPrivateIPv4,chooseHost,connectCommand}=require('./run.cjs');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
test('only RFC1918 interface addresses are eligible; do not bind an exposed or VPN interface',()=>{
 for(const ip of ['10.0.1.2','172.16.0.3','172.31.2.1','192.168.42.9'])assert.equal(isPrivateIPv4(ip),true);
 for(const ip of ['198.51.100.23','172.32.1.1','100.64.0.1','127.0.0.1'])assert.equal(isPrivateIPv4(ip),false);
 assert.deepEqual(addresses({eth0:[{family:'IPv4',address:'192.168.3.1',internal:false,netmask:'255.255.255.0'}],
   vpn:[{family:'IPv4',address:'100.64.0.1',internal:false,netmask:'255.255.255.0'}]}),['192.168.3.1']);
});
test('chooseHost rejects a nonlocal injected host address',async()=>{
 await assert.rejects(chooseHost(['198.51.100.23']),/not an active local LAN address/);
 if(addresses().length===1)assert.equal(await chooseHost([]),addresses()[0]);
});
test('only a local interface address is encoded and no fixed host is required',async()=>{
 const host=addresses()[0];if(!host)return;
 assert.equal(await chooseHost([host]),host);
 assert.match(connectCommand(host,[1,2,3,4]),new RegExp(host.split('.').join(',')));
});
test('direct invocation without peer refuses before boot consumption or listener',()=>{
 if(process.platform!=='linux'||!addresses().length)return;
 const boot='preflight-'+crypto.randomBytes(8).toString('hex');
 const receipt=path.join(__dirname,'runs','boot-'+boot+'.json');
 const result=spawnSync(process.execPath,['set-language.cjs','--language','ko','--boot-id',boot,addresses()[0]],
  {cwd:__dirname,encoding:'utf8',timeout:10000,env:{...process.env,
   NS2_FIREWALL_LEASE:'',NS2_SWITCH_PEER:''}});
 assert.equal(result.status,1);assert.match(result.stderr,/provide --peer-ip SWITCH_IP/);
 assert.equal(fs.existsSync(receipt),false);
});
