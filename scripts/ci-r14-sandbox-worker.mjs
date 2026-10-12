import {readFileSync,existsSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {connect,createServer as createTCP} from 'node:net';
import {createServer} from 'node:http';

const sha=x=>createHash('sha256').update(x).digest('hex');
const denyConnect=({host,port,path})=>new Promise(resolve=>{const c=connect(path?{path}:{host,port});let done=false;const finish=(status,error)=>{if(done)return;done=true;c.destroy();resolve({status,error})};c.setTimeout(1800,()=>finish('TIMEOUT','TIMEOUT'));c.on('error',e=>finish('DENIED',e.code));c.on('connect',()=>finish('CONNECTED',null));});
const checks=[];const pass=(id,details={})=>checks.push({id,status:'PASS',...details});
try {
 if(process.getuid?.()===0)throw Error('ROOT_PRIVILEGE_RETAINED');
 if(existsSync('/proc/self'))throw Error('HOST_PROC_EXPOSED');
 if(existsSync('/etc/hosts')||existsSync('/etc/passwd'))throw Error('HOST_ETC_EXPOSED');
 pass('host-etc-and-proc-inaccessible');
 const manifest=JSON.parse(readFileSync('/assets/manifest.json','utf8'));
 if(manifest.schemaVersion!==1||manifest.purpose!=='THIEPN_R14_SYNTHETIC_SANDBOX')throw Error('MANIFEST_INVALID');
 const data=readFileSync('/assets/fixture.txt');
 if(sha(data)!==manifest.fixtureSha256||data.toString()!=='R14 FICTIONAL DATA ONLY\n')throw Error('ASSET_INTEGRITY_FAIL');
 pass('synthetic-offline-bundle',{sha256:sha(data)});
 const hostPath=manifest.hostCanaryPath;
 if(typeof hostPath!=='string'||!hostPath.startsWith('/tmp/thiepn-r14-'))throw Error('CANARY_PATH_INVALID');
 if(existsSync(hostPath)||existsSync(manifest.hostSocketPath))throw Error('HOST_PATH_VISIBLE');
 for(const f of [hostPath,'/etc/hosts','/tmp/r14-write-attempt']){
   try{readFileSync(f);throw Error('UNEXPECTED_HOST_READ:'+f);}catch(e){if(e.message?.startsWith('UNEXPECTED'))throw e;if(e.code!=='ENOENT')throw e;}
 }
 pass('host-files-not-readable');
 const sock=await denyConnect({path:manifest.hostSocketPath});
 if(sock.status!=='DENIED'||sock.error!=='ENOENT')throw Error('HOST_SOCKET_ESCAPE:'+JSON.stringify(sock));
 pass('host-unix-socket-inaccessible',{reason:sock.error});
 const ext=await denyConnect({host:'198.51.100.1',port:443});
 if(ext.status!=='DENIED'||!['ENETUNREACH','EHOSTUNREACH','EPERM','EACCES'].includes(ext.error))throw Error('OUTBOUND_NETWORK_ESCAPE:'+JSON.stringify(ext));
 pass('outbound-ip-denied',{reason:ext.error});
 try{writeFileSync('/assets/writable','bad');throw Error('ROOTFS_WRITE_SUCCEEDED');}catch(e){if(e.message==='ROOTFS_WRITE_SUCCEEDED')throw e;if(!['EACCES','EROFS'].includes(e.code))throw e;}
 pass('read-only-rootfs');
 const srv=createServer((_req,res)=>res.end('R14 FICTIONAL DATA ONLY\n'));
 await new Promise((ok,fail)=>srv.once('error',fail).listen(0,'127.0.0.1',ok));
 try{
   const {get}=await import('node:http');const body=await new Promise((ok,fail)=>get('http://127.0.0.1:'+srv.address().port,res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>ok(data));}).on('error',fail));
   if(sha(body)!==manifest.fixtureSha256)throw Error('LOOPBACK_FIXTURE_MISMATCH');
   pass('loopback-fixture-readback');
 }finally{await new Promise(ok=>srv.close(ok));}
 if(process.env.NODE_OPTIONS||process.env.GITHUB_TOKEN||process.env.AZURE_DEVOPS_EXT_PAT)throw Error('CREDENTIAL_ENVIRONMENT');
 pass('no-secret-environment');
 console.log(JSON.stringify({status:'PASS_SYNTHETIC_CHROOT_ONLY',executionAllowed:false,fullIsolationProven:false,checks}));
}catch(e){console.error(JSON.stringify({status:'FAIL_CLOSED',error:e.message,checks}));process.exitCode=8;}
