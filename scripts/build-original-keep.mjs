#!/usr/bin/env node
/**
 * Offline-only source-qualified builder for ORIGINAL KEEP B3.
 * Run: node scripts/build-original-keep.mjs /path/to/checked-out KEEP PR #1 source
 * The original source is not silently downloaded, installed or migrated.
 * Generated public assets remain gitignored until separately authorized.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]??'');
if(!process.argv[2]||source===repo)throw new Error('Specify extracted complete KEEP B3 source directory.');
const root=path.resolve(source);
const rootPrefix=root+path.sep;
const check=(filename)=>{
  const full=path.resolve(root,filename);
  if(!full.startsWith(rootPrefix))throw new Error('Invalid source path: '+filename);
  const info=fs.lstatSync(full);
  if(!info.isFile()||info.isSymbolicLink())throw new Error('KEEP source must be a regular file: '+filename);
  return fs.readFileSync(full);
};
const digest=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=check('hub-embed/SOURCE_SHA256.json');
if(digest(manifestBytes)!=='f7eca79bd43e76d470a3042ea3ae66bfa88ada46b49f6a37d96b846fe1f9fa59')
  throw new Error('This is not the pinned original KEEP B3 source tree.');
const originals=JSON.parse(manifestBytes.toString('utf8'));
const names=Object.keys(originals);
if(names.length!==1271||!names.includes('src/App.tsx')||
   !names.includes('src/pkm/workspace/NoteWorkspaceView.tsx')||
   !names.includes('src/pkm/encryption/vaultEncryptionService.ts')||
   !names.includes('src/services/storage.ts'))throw new Error('Not the complete original KEEP B3 source.');
for(const [name,checksum] of Object.entries(originals)){
  if(!/^src\/[A-Za-z0-9_./-]+$/u.test(name)||name.includes('..')||
    typeof checksum!=='string'||!(/^[a-f0-9]{64}$/u.test(checksum))||
    digest(check(name))!==checksum)throw new Error('Original KEEP file integrity failed: '+name);
}
const pinnedInputs={
  'hub-embed/entry.tsx':'f4148f9940a892295d64fe993344eaa173ba6ddbc6f19d05c46cd0d269988fe8',
  'hub-embed/vite.config.ts':'7d1ca4bf20954164fdf03a646dbe2bfd6476ce7b26a5f4ece0130c2668114c08',
  'package.json':'653e357793d1361de10003e1ac819f74b791b780ea3e7a3b821c54082356a7e5',
  'bun.lock':'b62a4df384d47672d03dfe00527bce8e6415b05db129f97967d6e82044d043ba'
};
for(const [name,expected] of Object.entries(pinnedInputs)){
  if(digest(check(name))!==expected)throw new Error('KEEP original dependency/mount input changed: '+name);
}
const vite=path.join(root,'node_modules','.bin','vite');
if(!fs.existsSync(vite))throw new Error(
  'Original KEEP dependencies are not installed. No installation was attempted. Qualify the original lockfile first.');
const output=path.join(root,'hub-embed','dist');
execFileSync(vite,['build','--config','hub-embed/vite.config.ts'],{
  cwd:root,stdio:'inherit',env:{...process.env,NODE_ENV:'production'},timeout:180000
});
const bundle='keep-b3-original.js',style='keep-b3-original.css';
const outputFiles=[];
function scan(dir=''){
  const full=path.join(output,dir);
  for(const item of fs.readdirSync(full,{withFileTypes:true})){
    const rel=path.posix.join(dir,item.name),absolute=path.join(full,item.name);
    if(item.isSymbolicLink())throw new Error('Build output must not contain symlinks: '+rel);
    if(item.isDirectory()){scan(rel);continue;}
    if(!item.isFile()||!/^[A-Za-z0-9_./-]+$/u.test(rel)||rel.includes('..'))
      throw new Error('Invalid KEEP asset path: '+rel);
    if(fs.statSync(absolute).size>50*1024*1024)throw new Error('KEEP single-asset size cap exceeded: '+rel);
    outputFiles.push(rel);
  }
}
scan();
if(!outputFiles.includes(bundle)||!outputFiles.includes(style))
  throw new Error('Original KEEP JavaScript or CSS entry is missing.');
if(outputFiles.length>600)throw new Error('KEEP asset closure exceeds the verified manifest capacity.');
const assetContents=new Map();
let totalBytes=0;
const assets={};
for(const rel of outputFiles){
  const bytes=fs.readFileSync(path.join(output,rel));
  if(!bytes.length)throw new Error('Empty KEEP build asset: '+rel);
  totalBytes+=bytes.length;
  if(totalBytes>250*1024*1024)throw new Error('KEEP build asset limit exceeded.');
  assets[rel]=digest(bytes);
  assetContents.set(rel,bytes);
}
const js=assetContents.get(bundle),css=assetContents.get(style);
if(!js.toString('utf8').includes('mountOriginalKeep'))
  throw new Error('Original React mount export not found in built ESM.');
const built={
  format:'thiepn-keep-b3-original-react',schema:1,entry:bundle,css:style,
  sourceSha256:digest(manifestBytes),jsSha256:assets[bundle],cssSha256:assets[style],
  inputSha256:pinnedInputs,assets
};
const out=path.join(repo,'public','keep-b3-native');
if(fs.existsSync(out))throw new Error('Refusing to overwrite existing local KEEP output: '+out);
const tmp=fs.mkdtempSync(path.join(repo,'public','.keep-native-staging-'));
try {
  for(const [rel,bytes] of assetContents){
    const target=path.join(tmp,rel);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,bytes);
  }
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify(built,null,2)+'\n');
  fs.renameSync(tmp,out);
}catch(error){fs.rmSync(tmp,{recursive:true,force:true});throw error;}
console.log('Original KEEP B3 source integrity:',built.sourceSha256);
console.log('Complete local asset closure:',outputFiles.length,'files,',totalBytes,'bytes');
console.log('Local-only generated assets:',out);
