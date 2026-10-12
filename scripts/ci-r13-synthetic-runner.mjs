#!/usr/bin/env node
/**
 * R13 real Linux network namespace smoke test, synthetic fixtures only.
 * Not a security boundary for private code: no chroot/mount/fs isolation.
 * Never treats a missing unshare capability as a PASS.
 */
import {readlinkSync, existsSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PURPOSE,prepareSyntheticWorkspace,verifySyntheticWorkspace} from './ci-r13-synthetic-core.mjs';
const worker=fileURLToPath(new URL('./ci-r13-synthetic-worker.mjs',import.meta.url));
const evidencePath=process.argv[2];
const state={schemaVersion:1,purpose:PURPOSE,status:'NOT_TESTED',source:'R13_REAL_LOCAL_SYNTHETIC_EXECUTION',executionAllowed:false,privateSourceAccessed:false,credentialsIssued:false,fullFilesystemIsolation:false,checks:[],cleanup:'NOT_TESTED'};
let fixture;
try {
  fixture=prepareSyntheticWorkspace();
  const parent=readlinkSync('/proc/self/ns/net');
  verifySyntheticWorkspace(fixture.dir,fixture.manifestHash);
  // Environment allowlist intentionally excludes every external secret/token.
  const env={PATH:'/usr/sbin:/usr/bin:/sbin:/bin',HOME:fixture.dir,LANG:'C'};
  const cmd=['--user','--map-root-user','--net','--fork','--kill-child','--',process.execPath,worker,fixture.dir,fixture.manifestHash,parent];
  const r=spawnSync('/usr/bin/unshare',cmd,{encoding:'utf8',timeout:20000,maxBuffer:1024*1024,env,stdio:['ignore','pipe','pipe']});
  if(r.error||r.status!==0){
    const workerLine=r.stdout?.trim().split('\n').at(-1);
    let workerResult;try{workerResult=JSON.parse(workerLine);}catch{}
    const unsupported=!!r.error||/unshare:.*(Operation not permitted|Permission denied|Invalid argument)/i.test(r.stderr||'');
    state.status=unsupported?'NOT_TESTED_PLATFORM_UNSUPPORTED':'FAIL_CLOSED';
    state.reason=String(workerResult?.reason||r.error?.message||r.stderr||'exit '+r.status).trim().slice(0,500);
  }
  else {
    const line=r.stdout.trim().split('\n').at(-1);
    const result=JSON.parse(line);
    if(result.status!=='PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY'||result.executionAllowed!==false||result.fullFilesystemIsolation!==false||result.checks?.length!==5||result.checks.some(x=>x.result!=='PASS'))throw new Error('SYNTHETIC_WORKER_INCOMPLETE');
    state.status='PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY';state.checks=result.checks;
  }
}catch(e){state.status='FAIL_CLOSED';state.reason=String(e.message||e);}finally {
  if(fixture){rmSync(fixture.dir,{recursive:true,force:true});state.cleanup=existsSync(fixture.dir)?'FAIL':'PASS';}
  else state.cleanup='NOT_CREATED';
  if(state.cleanup==='FAIL')state.status='FAIL_CLOSED';
  const output=JSON.stringify(state,null,2)+'\n';
  if(evidencePath)writeFileSync(evidencePath,output,{flag:'wx',mode:0o600});
  process.stdout.write(output);
  if(state.status!=='PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY'||state.cleanup!=='PASS')process.exitCode=1;
}
