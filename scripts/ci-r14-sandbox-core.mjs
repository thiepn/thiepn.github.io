/** Synthetic-only R14 filesystem bundle. No production source, credentials or private checkout. */
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,chmodSync,lstatSync,readdirSync,realpathSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

export const PURPOSE='THIEPN_R14_SYNTHETIC_SANDBOX';
export const FIXTURE='R14 FICTIONAL DATA ONLY\n';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const digestFile=path=>sha256(readFileSync(path));
const fixedNames=['fixture.txt','manifest.json'];
export function inspectBundle(assetsDir, expectedManifestHash){
  const names=readdirSync(assetsDir).sort();
  if(JSON.stringify(names)!==JSON.stringify(fixedNames))throw Error('UNEXPECTED_FIXTURE_PATH');
  for(const name of names){const f=lstatSync(join(assetsDir,name));if(!f.isFile()||f.isSymbolicLink()||f.size>65536)throw Error('UNSAFE_FIXTURE_FILE');}
  const file=join(assetsDir,'manifest.json');
  if(!/^[a-f0-9]{64}$/.test(expectedManifestHash||'')||digestFile(file)!==expectedManifestHash)throw Error('UNTRUSTED_MANIFEST');
  let m;
  try{m=JSON.parse(readFileSync(file,'utf8'));}catch{throw Error('MANIFEST_JSON_INVALID');}
  const keys=['schemaVersion','purpose','fixtureSha256','hostCanaryPath','hostSocketPath'];
  if(Object.keys(m).sort().join(',')!==keys.sort().join(',')||m.schemaVersion!==1||m.purpose!==PURPOSE)throw Error('UNEXPECTED_MANIFEST_SCHEMA');
  if(!m.hostCanaryPath?.startsWith('/tmp/thiepn-r14-')||!m.hostSocketPath?.startsWith('/tmp/thiepn-r14-'))throw Error('INVALID_HOST_CANARY');
  if(!/^[a-f0-9]{64}$/.test(m.fixtureSha256)||m.fixtureSha256!==sha256(FIXTURE)||digestFile(join(assetsDir,'fixture.txt'))!==m.fixtureSha256)throw Error('FICTIONAL_PAYLOAD_CHANGED');
  return m;
}
export function runtimeLibraries(nodePath){
  const r=spawnSync('/usr/bin/ldd',[nodePath],{encoding:'utf8',timeout:12000});
  if(r.status!==0||r.error)throw Error('RUNTIME_LDD_UNAVAILABLE');
  const paths=new Set();
  for(const line of r.stdout.split('\n')){
    for(const match of line.matchAll(/(?:=>\s+)?(\/[^\s()]+)\s+\(0x[0-9a-f]+\)/g)){
      const file=match[1];if(!file.startsWith('/lib/')&&!file.startsWith('/lib64/')&&!file.startsWith('/usr/lib/'))throw Error('UNTRUSTED_RUNTIME_LIBRARY_PATH');
      if(!existsSync(file)||!lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink())throw Error('MISSING_RUNTIME_LIBRARY');
      paths.add(file);
    }
  }
  if(![...paths].some(x=>x.includes('ld-linux')))throw Error('DYNAMIC_LOADER_MISSING');
  return [...paths].sort();
}
function stage(root,src,dst,mode){const dest=join(root,dst.replace(/^\//,''));mkdirSync(dirname(dest),{recursive:true,mode:0o755});copyFileSync(src,dest);chmodSync(dest,mode);}
export function prepareSyntheticBundle({nodePath=process.execPath,workerPath,base=tmpdir()}={}){
  if(typeof workerPath!=='string'||!lstatSync(workerPath).isFile())throw Error('WORKER_FILE_MISSING');
  const directory=mkdtempSync(join(base,'thiepn-r14-'));
  const root=join(directory,'rootfs');const assets=join(root,'assets');
  try{
    for(const p of ['bin','app','assets','tmp'])mkdirSync(join(root,p),{recursive:true,mode:0o755});
    stage(root,nodePath,'bin/node',0o555);
    for(const lib of runtimeLibraries(nodePath))stage(root,lib,lib,lib.includes('ld-linux')?0o555:0o444);
    stage(root,workerPath,'app/worker.mjs',0o444);
    const canary=join(directory,'host-sentinel');const socket=join(directory,'host.sock');
    writeFileSync(canary,'SYNTHETIC HOST CANARY NOT PRIVATE DATA\n',{mode:0o600,flag:'wx'});
    const manifest={schemaVersion:1,purpose:PURPOSE,fixtureSha256:sha256(FIXTURE),hostCanaryPath:canary,hostSocketPath:socket};
    const manifestText=JSON.stringify(manifest)+'\n';
    writeFileSync(join(assets,'fixture.txt'),FIXTURE,{mode:0o444,flag:'wx'});
    writeFileSync(join(assets,'manifest.json'),manifestText,{mode:0o444,flag:'wx'});
    chmodSync(join(assets,'fixture.txt'),0o444);chmodSync(join(assets,'manifest.json'),0o444);
    for(const p of [root,join(root,'bin'),join(root,'app'),assets,join(root,'tmp')])chmodSync(p,0o555);
    const expectedManifestHash=sha256(manifestText);
    inspectBundle(assets,expectedManifestHash);
    return {directory,root,assets,expectedManifestHash,manifest,runtimeSha256:digestFile(join(root,'bin/node')),workerSha256:digestFile(join(root,'app/worker.mjs'))};
  }catch(e){rmSync(directory,{recursive:true,force:true});throw e;}
}
export function disposeSyntheticBundle(bundle){if(bundle?.directory)rmSync(bundle.directory,{recursive:true,force:true});return !existsSync(bundle?.directory||'');}
