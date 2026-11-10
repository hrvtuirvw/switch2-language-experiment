'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {addresses,isPrivateIPv4,chooseHost,connectCommand}=require('./run.cjs');
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
