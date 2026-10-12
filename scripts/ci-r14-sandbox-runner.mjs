#!/usr/bin/env node
/** Executable synthetic-only Linux namespace/chroot proof. NOT permission for Account CI. */
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {readlinkSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareSyntheticBundle,inspectBundle,disposeSyntheticBundle,PURPOSE} from './ci-r14-sandbox-core.mjs';

const workerPath=fileURLToPath(new URL('./ci-r14-sandbox-worker.mjs',import.meta.url));
const bootstrap=fileURLToPath(new URL('./ci-r14-sandbox-bootstrap.sh',import.meta.url));
const baseline={schemaVersion:1,purpose:PURPOSE,status:'NOT_TESTED',executionAllowed:false,privateSourceAccessed:false,credentialsIssued:false,fullIsolationProven:false,checks:[],cleanup:'NOT_TESTED'};
export async function runSyntheticSandbox({evidencePath,unshare='/usr/bin/unshare'}={}){
 const result={...baseline,checks:[]};let bundle;let server;
 try{
   bundle=prepareSyntheticBundle({workerPath});
   inspectBundle(bundle.assets,bundle.expectedManifestHash);
   server=createServer();
   await new Promise((ok,bad)=>{server.once('error',bad);server.listen(bundle.manifest.hostSocketPath,ok);});
   const args=['--user','--map-users',`0:${process.getuid()}:1`,'--map-users','65534:65534:1','--map-groups',`0:${process.getgid()}:1`,'--map-groups','65534:65534:1','--net','--mount','--pid','--fork','--kill-child','/bin/sh',bootstrap,bundle.root,readlinkSync('/proc/self/ns/net'),readlinkSync('/proc/self/ns/mnt')];
   const env={PATH:'/usr/sbin:/usr/bin:/sbin:/bin',HOME:'/tmp',LANG:'C'};
   const outcome=await new Promise(resolve=>{
     const child=spawn(unshare,args,{env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',finished=false;
     const timeout=setTimeout(()=>{child.kill('SIGKILL');},25000);
     child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>100000)child.kill('SIGKILL');});
     child.stderr.on('data',b=>{stderr+=b.toString();if(stderr.length>100000)child.kill('SIGKILL');});
     child.once('error',e=>{if(!finished){finished=true;clearTimeout(timeout);resolve({code:-1,stdout,stderr,error:e.message});}});
     child.once('close',code=>{if(!finished){finished=true;clearTimeout(timeout);resolve({code,stdout,stderr});}});
   });
   if(outcome.code!==0){result.status=/Operation not permitted|Permission denied|map.*failed|Invalid argument/.test(outcome.stderr)?'NOT_TESTED_UNSUPPORTED_PLATFORM':'FAIL_CLOSED';result.reason=(outcome.error||outcome.stderr||outcome.stdout||String(outcome.code)).trim().slice(0,400);}
   else {
     const value=JSON.parse(outcome.stdout.trim().split('\n').at(-1));
     if(value.status!=='PASS_SYNTHETIC_CHROOT_ONLY'||value.executionAllowed!==false||value.fullIsolationProven!==false||value.checks?.length!==8||value.checks.some(x=>x.status!=='PASS'))throw Error('SANDBOX_REPORT_INCOMPLETE');
     result.status='PASS_SYNTHETIC_READONLY_CHROOT_AND_NETNS';result.checks=value.checks;
     result.proven={networkAndMountNamespaces:true,unprivilegedUid:65534,readOnlyRoot:true,hostCanarySocketDenied:true,outboundTcpDenied:true,localhostAvailable:true};
     result.bundle={fixtureSha256:bundle.manifest.fixtureSha256,runtimeSha256:bundle.runtimeSha256,workerSha256:bundle.workerSha256};
   }
 }catch(e){result.status='FAIL_CLOSED';result.reason=String(e.message||e).slice(0,400);}
 finally{
   if(server)await new Promise(ok=>server.close(ok));
   result.cleanup=bundle?disposeSyntheticBundle(bundle)?'PASS':'FAIL':'NOT_CREATED';
   if(result.cleanup==='FAIL')result.status='FAIL_CLOSED';
   if(evidencePath){try{writeFileSync(evidencePath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){result.status='FAIL_CLOSED';result.reason='EVIDENCE_WRITE_FAILED:'+e.code;}}
 }
 return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const result=await runSyntheticSandbox({evidencePath:process.argv[2]});
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='PASS_SYNTHETIC_READONLY_CHROOT_AND_NETNS'||result.cleanup!=='PASS')process.exitCode=1;
}
