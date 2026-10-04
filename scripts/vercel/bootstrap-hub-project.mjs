import fs from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { ensureHubProject } from '../provision-vercel-hub.mjs';
import { validateEnvironmentContract, validateProduct } from './validate-product-family.mjs';
import { auditEnvironmentMetadata } from './audit-environment-contract.mjs';

const API='https://api.vercel.com';

function asObject(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Vercel API returned an invalid object');
  return value;
}
async function readBody(response){
  const text=await response.text();
  if(!text)return {};
  try{return JSON.parse(text);}catch{return{message:text.slice(0,300)};}
}
async function api(fetchImpl,token,path,init={}){
  const headers=new Headers(init.headers);
  headers.set('Authorization','Bearer '+token);
  headers.set('Content-Type','application/json');
  const response=await fetchImpl(API+path,{...init,headers,redirect:'error',signal:AbortSignal.timeout(15000)});
  return{response,body:await readBody(response)};
}
function fail(action,response,body){
  const value=asObject(body);
  const nested=value.error&&typeof value.error==='object'&&!Array.isArray(value.error)?value.error:{};
  const code=typeof nested.code==='string'?nested.code:'';
  const message=typeof nested.message==='string'?nested.message:typeof value.message==='string'?value.message:'';
  throw new Error(action+' failed with HTTP '+response.status+(code?': '+code:'')+(message?' — '+message:''));
}
export function productionEntries(contract){
  validateEnvironmentContract(contract);
  return contract.vercel.productionProvisionedPublic.map(key=>{
    const value=contract.build.fixedPublic[key];
    if(typeof value!=='string'||!value)throw new Error('Missing fixed public value for '+key);
    return{key,value,type:'plain',target:['production'],comment:'THIEPN P6 source-controlled public build configuration'};
  });
}
export function assertProjectState(raw){
  const value=asObject(raw);
  if(typeof value.id!=='string'||typeof value.name!=='string'||typeof value.accountId!=='string'||!/^(?:team|usr)_[A-Za-z0-9]+$/.test(value.accountId))throw new Error('Invalid Vercel project');
  if(value.name!=='thiepn-hub')throw new Error('Unexpected Vercel project name');
  if(value.link&&typeof value.link==='object'&&!Array.isArray(value.link))throw new Error('Vercel Git integration must remain absent');
  if(value.framework!=='astro')throw new Error('Vercel framework drift');
  if(value.nodeVersion!=='24.x')throw new Error('Vercel Node version drift');
  if(value.outputDirectory!=='dist')throw new Error('Vercel output directory drift');
  if(value.buildCommand!=='npm run build:enriched')throw new Error('Vercel build command drift');
  if(value.installCommand!=='npm ci')throw new Error('Vercel install command drift');
  if(value.autoAssignCustomDomains!==false)throw new Error('Automatic custom-domain assignment must be disabled');
  return{id:value.id,name:value.name,accountId:value.accountId};
}
export function assertDomains(raw){
  const value=asObject(raw);
  if(!Array.isArray(value.domains))throw new Error('Invalid Vercel domain response');
  const custom=value.domains.map(d=>d&&typeof d==='object'&&!Array.isArray(d)&&typeof d.name==='string'?d.name:'').filter(Boolean).filter(name=>!name.endsWith('.vercel.app'));
  if(custom.length)throw new Error('Custom Vercel domains are forbidden before cutover: '+custom.join(', '));
  return value.domains.map(d=>d.name).filter(Boolean);
}
export async function bootstrapHubProject({token,fetchImpl=fetch,projectName='thiepn-hub'}){
  if(!token)throw new Error('VERCEL_TOKEN is required');
  const [product,contract]=await Promise.all([
    fs.readFile('ops/vercel/thiepn-hub.json','utf8').then(JSON.parse),
    fs.readFile('ops/vercel/environment-contract.json','utf8').then(JSON.parse),
  ]);
  validateProduct(product);validateEnvironmentContract(contract);
  if(product.projectName!==projectName)throw new Error('Project-name contract mismatch');

  const ensured=await ensureHubProject({token,projectName,fetchImpl});
  const id=ensured.project.id;

  const patch=await api(fetchImpl,token,'/v9/projects/'+encodeURIComponent(id),{
    method:'PATCH',
    body:JSON.stringify({
      framework:'astro',
      buildCommand:'npm run build:enriched',
      installCommand:'npm ci',
      outputDirectory:'dist',
      nodeVersion:'24.x',
      autoAssignCustomDomains:false,
      autoExposeSystemEnvs:false,
      directoryListing:false,
      skipGitConnectDuringLink:true,
      enablePreviewFeedback:false,
      enableProductionFeedback:false,
    }),
  });
  if(!patch.response.ok)fail('Vercel project hardening',patch.response,patch.body);

  const projectLookup=await api(fetchImpl,token,'/v9/projects/'+encodeURIComponent(id),{method:'GET'});
  if(!projectLookup.response.ok)fail('Vercel project verification',projectLookup.response,projectLookup.body);
  const project=assertProjectState(projectLookup.body);

  for(const entry of productionEntries(contract)){
    const created=await api(fetchImpl,token,'/v10/projects/'+encodeURIComponent(id)+'/env?upsert=true',{
      method:'POST',
      body:JSON.stringify(entry),
    });
    if(!created.response.ok)fail('Vercel environment upsert for '+entry.key,created.response,created.body);
  }

  const envLookup=await api(fetchImpl,token,'/v10/projects/'+encodeURIComponent(id)+'/env?decrypt=false',{method:'GET'});
  if(!envLookup.response.ok)fail('Vercel environment verification',envLookup.response,envLookup.body);
  const environment=auditEnvironmentMetadata(contract,envLookup.body,'production');

  const domainsLookup=await api(fetchImpl,token,'/v9/projects/'+encodeURIComponent(id)+'/domains?limit=100',{method:'GET'});
  if(!domainsLookup.response.ok)fail('Vercel domain verification',domainsLookup.response,domainsLookup.body);
  const domains=assertDomains(domainsLookup.body);

  return{project,created:ensured.created,environment,domains};
}
function output(name,value){
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,name+'='+value+'\n','utf8');
}
async function main(){
  const result=await bootstrapHubProject({token:process.env.VERCEL_TOKEN??'',projectName:process.env.VERCEL_PROJECT_NAME??'thiepn-hub'});
  output('project-id',result.project.id);output('project-name',result.project.name);output('org-id',result.project.accountId);output('project-created',String(result.created));
  if(process.env.GITHUB_ENV){appendFileSync(process.env.GITHUB_ENV,'VERCEL_PROJECT_ID='+result.project.id+'\nVERCEL_ORG_ID='+result.project.accountId+'\n','utf8');}
  console.log('P6 Vercel bootstrap passed: '+result.project.name+' ('+result.project.id+'), production env keys='+result.environment.count+', custom domains=0.');
}
if(import.meta.url==='file://'+process.argv[1])await main();
