import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2), root=path.resolve(import.meta.dirname,'..');
const core=args.find(a=>!a.startsWith('--'));
if(!core) throw new Error('Pass a checked-out thiepn/core repository. No network fetch is implicit.');
execFileSync('git',['-C',path.resolve(core),'diff','--quiet','HEAD','--','registry/launches.v1.json','registry/products.v2.json']);
const raw=fs.readFileSync(path.resolve(core,'registry/launches.v1.json'),'utf8');
const registry=JSON.parse(raw), products=JSON.parse(fs.readFileSync(path.resolve(core,'registry/products.v2.json')));
if(registry.schemaVersion!==1)throw new Error('Unsupported launch schema');
const ids=new Set(), urls=new Set(), aliasOwners=new Map();
for(const entry of registry.entries){
 if(ids.has(entry.id)||!/^[a-z0-9-]+$/.test(entry.id))throw new Error('Invalid/duplicate launch ID: '+entry.id);ids.add(entry.id);
 const url=new URL(entry.url);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Unsafe launch URL: '+entry.id);
 if(!registry.categories.some(c=>c.id===entry.category))throw new Error('Unknown category: '+entry.id);
 for(const alias of [entry.id,...entry.aliases]){const key=alias.toLowerCase();if(aliasOwners.has(key)&&aliasOwners.get(key)!==entry.id)throw new Error('Ambiguous alias: '+alias);aliasOwners.set(key,entry.id);}
 if(entry.moduleRef){const [p,m]=entry.moduleRef.split('/');const module=products.products.find(x=>x.id===p)?.modules.find(x=>x.id===m);if(!module||module.state!==entry.state||module.launchUrl?.replace(/\/$/,'')!==entry.url.replace(/\/$/,''))throw new Error('Module contract mismatch: '+entry.id);}
 if(entry.visibility==='public'&&entry.state==='active'){const key=entry.url.replace(/\/$/,'');if(urls.has(key))throw new Error('Duplicate destination: '+key);urls.add(key);}
}
const entries=registry.entries.filter(e=>e.visibility==='public'&&e.state==='active'&&!registry.excluded.includes(e.id));
const output=JSON.stringify({schemaVersion:1,source:{repository:'thiepn/core',commit:execFileSync('git',['-C',path.resolve(core),'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha256:createHash('sha256').update(raw).digest('hex')},categories:registry.categories,excluded:registry.excluded,entries},null,2)+'\n';
const target=path.join(root,'src/generated/launch-manifest.json');
if(args.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw new Error('Launch manifest is stale');}else fs.writeFileSync(target,output);
const productOutput=JSON.stringify(products,null,2)+'\n';
const productTarget=path.join(root,'src/data/products-v2.json');
if(args.includes('--check')){if(fs.readFileSync(productTarget,'utf8')!==productOutput)throw new Error('Product projection is stale');}else fs.writeFileSync(productTarget,productOutput);
console.log(`Validated ${entries.length} public launch destinations`);
