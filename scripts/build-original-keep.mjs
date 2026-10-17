#!/usr/bin/env node
/**
 * Offline-only source-qualified builder for ORIGINAL KEEP B3.
 * Run: node scripts/build-original-keep.mjs /path/to/extracted/K6/source
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
const originals=JSON.parse(manifestBytes.toString('utf8'));
const names=Object.keys(originals);
if(names.length!==1269||!names.includes('src/App.tsx')||
   !names.includes('src/pkm/workspace/NoteWorkspaceView.tsx')||
   !names.includes('src/pkm/encryption/vaultEncryptionService.ts')||
   !names.includes('src/services/storage.ts'))throw new Error('Not the complete original KEEP B3 source.');
for(const [name,checksum] of Object.entries(originals)){
  if(!/^src\/[A-Za-z0-9_./-]+$/u.test(name)||name.includes('..')||
    typeof checksum!=='string'||!(/^[a-f0-9]{64}$/u.test(checksum))||
    digest(check(name))!==checksum)throw new Error('Original KEEP file integrity failed: '+name);
}
for(const required of ['hub-embed/entry.tsx','hub-embed/vite.config.ts','package.json','bun.lock'])
  check(required);
const vite=path.join(root,'node_modules','.bin','vite');
if(!fs.existsSync(vite))throw new Error(
  'Original KEEP dependencies are not installed. No installation was attempted. Qualify the original lockfile first.');
const output=path.join(root,'hub-embed','dist');
execFileSync(vite,['build','--config','hub-embed/vite.config.ts'],{
  cwd:root,stdio:'inherit',env:{...process.env,NODE_ENV:'production'},timeout:180000
});
const bundle='keep-b3-original.js',style='keep-b3-original.css';
for(const asset of [bundle,style]){
  const found=path.join(output,asset);
  if(!fs.existsSync(found)||!fs.statSync(found).isFile()||fs.statSync(found).size===0)
    throw new Error('Original React build asset missing: '+asset);
}
const extras=fs.readdirSync(output).filter(name=>name!==bundle&&name!==style);
if(extras.length)throw new Error(
  'Original KEEP build emitted dynamic assets which are not covered by the two-file integrity manifest: '+extras.join(', '));
const js=fs.readFileSync(path.join(output,bundle)),css=fs.readFileSync(path.join(output,style));
if(!js.includes('mountOriginalKeep'))throw new Error('Original React mount export not found in built ESM.');
const built={
  format:'thiepn-keep-b3-original-react',schema:1,entry:bundle,css:style,
  sourceSha256:digest(manifestBytes),jsSha256:digest(js),cssSha256:digest(css)
};
const out=path.join(repo,'public','keep-b3-native');
if(fs.existsSync(out))throw new Error('Refusing to overwrite existing local KEEP output: '+out);
const tmp=fs.mkdtempSync(path.join(repo,'public','.keep-native-staging-'));
try {
  fs.writeFileSync(path.join(tmp,bundle),js);
  fs.writeFileSync(path.join(tmp,style),css);
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify(built,null,2)+'\n');
  fs.renameSync(tmp,out);
}catch(error){fs.rmSync(tmp,{recursive:true,force:true});throw error;}
console.log('Original KEEP B3 build qualified locally:',built.sourceSha256);
console.log('Local-only generated assets:',out);
