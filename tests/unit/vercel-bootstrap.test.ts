import fs from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertDomains,
  assertProjectState,
  bootstrapHubProject,
  productionEntries,
} from '../../scripts/vercel/bootstrap-hub-project.mjs';

afterEach(()=>vi.restoreAllMocks());

describe('P6 real Vercel bootstrap contract',()=>{
  it('provisions only checked-in public Production build variables',async()=>{
    const contract=JSON.parse(await fs.readFile('ops/vercel/environment-contract.json','utf8'));
    const entries=productionEntries(contract);
    expect(entries.map(x=>x.key)).toEqual(contract.vercel.productionProvisionedPublic);
    expect(entries.every(x=>x.type==='plain'&&x.target.length===1&&x.target[0]==='production')).toBe(true);
    expect(entries.some(x=>/SECRET|SERVICE_ROLE|PRIVATE_RUNTIME/.test(x.key))).toBe(false);
  });

  it('requires the hardened unlinked Astro project state',()=>{
    expect(assertProjectState({
      id:'prj_fixture',name:'thiepn-hub',link:null,framework:'astro',nodeVersion:'24.x',
      outputDirectory:'dist',buildCommand:'npm run build:enriched',installCommand:'npm ci',
      autoAssignCustomDomains:false,
    })).toEqual({id:'prj_fixture',name:'thiepn-hub'});
    expect(()=>assertProjectState({
      id:'prj_fixture',name:'thiepn-hub',link:{type:'github'},framework:'astro',nodeVersion:'24.x',
      outputDirectory:'dist',buildCommand:'npm run build:enriched',installCommand:'npm ci',
      autoAssignCustomDomains:false,
    })).toThrow('Git integration');
    expect(()=>assertProjectState({
      id:'prj_fixture',name:'thiepn-hub',link:null,framework:'astro',nodeVersion:'24.x',
      outputDirectory:'dist',buildCommand:'npm run build:enriched',installCommand:'npm ci',
      autoAssignCustomDomains:true,
    })).toThrow('custom-domain');
  });

  it('allows only Vercel-owned domains before canonical cutover',()=>{
    expect(assertDomains({domains:[{name:'thiepn-hub.vercel.app'}]})).toEqual(['thiepn-hub.vercel.app']);
    expect(()=>assertDomains({domains:[{name:'thiepn.dev'}]})).toThrow('before cutover');
  });

  it('creates/reconciles project, public Production env and domain policy without decrypting values',async()=>{
    const contract=JSON.parse(await fs.readFile('ops/vercel/environment-contract.json','utf8'));
    const keys=contract.vercel.productionProvisionedPublic;
    const responses=[
      Response.json({id:'prj_fixture',name:'thiepn-hub',link:null}),
      Response.json({ok:true}),
      Response.json({
        id:'prj_fixture',name:'thiepn-hub',link:null,framework:'astro',nodeVersion:'24.x',
        outputDirectory:'dist',buildCommand:'npm run build:enriched',installCommand:'npm ci',
        autoAssignCustomDomains:false,
      }),
      ...keys.map(key=>Response.json({created:{id:'env_'+key,key},failed:[]})),
      Response.json({envs:keys.map(key=>({key,target:['production'],type:'plain'}))}),
      Response.json({domains:[{name:'thiepn-hub.vercel.app'}]}),
    ];
    const fetchImpl=vi.fn(async()=>responses.shift()!);
    const result=await bootstrapHubProject({token:'fixture-token',fetchImpl});
    expect(result.project).toEqual({id:'prj_fixture',name:'thiepn-hub'});
    expect(result.environment.keys).toEqual([...keys].sort());
    expect(result.domains).toEqual(['thiepn-hub.vercel.app']);
    const calls=fetchImpl.mock.calls.map(([url,init])=>({url:String(url),method:init?.method??'GET',body:init?.body?JSON.parse(String(init.body)):null}));
    expect(calls[1]?.body).toMatchObject({nodeVersion:'24.x',autoAssignCustomDomains:false,autoExposeSystemEnvs:false});
    expect(calls.filter(c=>c.url.includes('/env?upsert=true'))).toHaveLength(keys.length);
    expect(calls.some(c=>c.url.endsWith('/env?decrypt=false'))).toBe(true);
  });
});
