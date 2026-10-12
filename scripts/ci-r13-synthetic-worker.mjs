/** Fail-closed offline network worker. No ability to fetch private data. */
import {readlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import {verifySyntheticWorkspace, sha256, SYNTHETIC_TEXT, PURPOSE} from './ci-r13-synthetic-core.mjs';

const stop=(code,msg)=>{console.log(JSON.stringify({purpose:PURPOSE,status:'FAIL_CLOSED',reason:msg}));process.exit(code);};
const out=[];
const ip=(args)=>{const v=spawnSync('/usr/sbin/ip',args,{encoding:'utf8',timeout:5000});if(v.status!==0)throw new Error('IP_COMMAND_FAILED:'+args.join(' '));return v.stdout.trim();};
const probe=({host,port})=>new Promise(resolve=>{const c=net.connect({host,port});let ended=false;const finish=(status,code)=>{if(ended)return;ended=true;c.destroy();resolve({status,code})};c.setTimeout(1200,()=>finish('TIMEOUT','TIMEOUT'));c.on('error',e=>finish('DENIED',e.code));c.on('connect',()=>finish('CONNECTED',null));});
try {
  const [dir,manifestHash,parentNetns]=process.argv.slice(2);
  if(!dir||!manifestHash||!parentNetns)throw new Error('MISSING_TRUSTED_PARENT_INPUT');
  const current=readlinkSync('/proc/self/ns/net');
  if(current===parentNetns)throw new Error('NO_NETWORK_NAMESPACE_SEPARATION');
  const permitted=new Set(['PATH','HOME','LANG']);
  if(Object.keys(process.env).some(k=>!permitted.has(k)))throw new Error('UNSAFE_ENVIRONMENT_VARIABLE');
  ip(['link','set','lo','up']);
  const route=JSON.parse(ip(['-json','route','show']));
  if(!Array.isArray(route)||route.length!==0)throw new Error('OUTBOUND_IPV4_ROUTE_PRESENT');
  const routeV6=JSON.parse(ip(['-json','-6','route','show']));
  if(!Array.isArray(routeV6)||routeV6.length!==0)throw new Error('OUTBOUND_IPV6_ROUTE_PRESENT');
  out.push({id:'separate-netns',result:'PASS',namespace:current});
  out.push({id:'no-ipv4-or-ipv6-routes',result:'PASS'});
  const integrity=verifySyntheticWorkspace(dir,manifestHash);
  out.push({id:'immutable-synthetic-fixture',result:'PASS',...integrity});
  // Numeric TEST-NET-2 address avoids DNS and any accidental real-service access.
  const blocked=await probe({host:'198.51.100.1',port:443});
  if(blocked.status!=='DENIED'||!['ENETUNREACH','EHOSTUNREACH','EACCES','EPERM'].includes(blocked.code))throw new Error('OUTBOUND_NOT_PROVEN_DENIED:'+JSON.stringify(blocked));
  out.push({id:'outbound-tcp-denied',result:'PASS',errorCode:blocked.code});
  const server=http.createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end(SYNTHETIC_TEXT);});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try {
    const port=server.address().port;
    const response=await new Promise((resolve,reject)=>{http.get('http://127.0.0.1:'+port+'/',res=>{let b='';res.setEncoding('utf8');res.on('data',x=>b+=x);res.on('end',()=>resolve({status:res.statusCode,body:b}));}).on('error',reject);});
    if(response.status!==200||sha256(response.body)!==sha256(SYNTHETIC_TEXT))throw new Error('LOCALHOST_FIXTURE_FAILED');
    out.push({id:'loopback-http-fixture',result:'PASS',sha256:sha256(response.body)});
  } finally {await new Promise(r=>server.close(r));}
  console.log(JSON.stringify({purpose:PURPOSE,status:'PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY',executionAllowed:false,fullFilesystemIsolation:false,checks:out}));
}catch(e){stop(8,String(e.message||e));}
