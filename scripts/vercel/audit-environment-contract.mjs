import fs from 'node:fs/promises';
import {validateEnvironmentContract,validateProduct} from './validate-product-family.mjs';
const API='https://api.vercel.com';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function auditEnvironmentMetadata(contract,raw,target='production'){
 validateEnvironmentContract(contract);if(!object(raw)||!Array.isArray(raw.envs))throw new Error('Invalid Vercel environment response');
 const applicable=raw.envs.filter(item=>object(item)&&typeof item.key==='string'&&Array.isArray(item.target)&&item.target.includes(target));
 const keys=new Set(applicable.map(item=>item.key));
 const forbidden=new Set([...(target==='production'?contract.vercel.productionForbidden:[]),...contract.vercel.neverAllowed]);
 const found=[...keys].filter(key=>forbidden.has(key)).sort();
 if(found.length)throw new Error('Forbidden '+target+' Vercel variables: '+found.join(', '));
 if(target==='production'){
  const missing=contract.vercel.productionProvisionedPublic.filter(key=>!keys.has(key));
  if(missing.length)throw new Error('Missing production Vercel variables: '+missing.join(', '));
 }
 return{target,count:applicable.length,keys:[...keys].sort()};
}
export async function fetchEnvironmentMetadata({token,projectName,fetchImpl=fetch}){
 if(!token)throw new Error('VERCEL_TOKEN is required');
 const url=API+'/v10/projects/'+encodeURIComponent(projectName)+'/env?decrypt=false';
 const response=await fetchImpl(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Vercel environment lookup failed with HTTP '+response.status);return response.json();
}
async function main(){
 const [product,contract]=await Promise.all(['ops/vercel/thiepn-hub.json','ops/vercel/environment-contract.json'].map(async p=>JSON.parse(await fs.readFile(p,'utf8'))));
 validateProduct(product);validateEnvironmentContract(contract);
 const raw=await fetchEnvironmentMetadata({token:process.env.VERCEL_TOKEN??'',projectName:process.env.VERCEL_PROJECT_ID||product.projectName});
 const result=auditEnvironmentMetadata(contract,raw,process.env.VERCEL_ENV_TARGET||'production');
 console.log('Vercel '+result.target+' environment metadata passed: '+result.count+' scoped variables; no forbidden keys present.');
}
if(import.meta.url==='file://'+process.argv[1])await main();
