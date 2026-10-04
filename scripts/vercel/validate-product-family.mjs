import fs from 'node:fs/promises';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateProduct(value){
 if(!object(value)||value.schemaVersion!==1||value.productId!=='hub'||value.family!=='hub'||value.projectName!=='thiepn-hub'||value.repository!=='thiepn/thiepn.github.io'||value.framework!=='astro'||value.nodeMajor!==24||!/^\d+\.\d+\.\d+$/.test(value.vercelCliVersion))throw new Error('Invalid Vercel product manifest');
 if(!object(value.deployment)||value.deployment.mode!=='manual-cli'||value.deployment.gitIntegration!==false||value.deployment.automaticDeployments!==false||value.deployment.candidateTarget!=='production'||value.deployment.candidateSkipDomain!==true||value.deployment.promotion!=='explicit-certified-deployment'||value.deployment.rollback!=='explicit-certified-deployment')throw new Error('Unsafe deployment policy');
 if(!object(value.production)||value.production.canonicalDomain!=='thiepn.dev'||value.production.trafficOwnerUntilCutover!=='github-pages'||value.production.vercelCustomDomainAssignmentAllowed!==false)throw new Error('Unsafe production ownership policy');
 return value;
}
export function validateEnvironmentContract(value){
 if(!object(value)||value.schemaVersion!==1||value.productId!=='hub'||!object(value.ci)||!object(value.build)||!object(value.vercel))throw new Error('Invalid environment contract');
 const lists=[value.ci.requiredSecrets,value.ci.neverProjectEnvironment,value.vercel.productionForbidden,value.vercel.neverAllowed];
 for(const list of lists)if(!Array.isArray(list)||list.some(x=>typeof x!=='string'||!/^[A-Z][A-Z0-9_]+$/.test(x))||new Set(list).size!==list.length)throw new Error('Invalid environment variable list');
 if(!value.ci.requiredSecrets.includes('VERCEL_TOKEN')||!value.ci.neverProjectEnvironment.includes('VERCEL_TOKEN')||!value.vercel.neverAllowed.includes('VERCEL_TOKEN'))throw new Error('VERCEL_TOKEN boundary missing');
 const runtime=value.vercel.privateRuntime;
 if(!object(runtime)||runtime.activation!=='THIEPN_HUB_PRIVATE_RUNTIME'||runtime.activationValue!=='staged-v1'||!Array.isArray(runtime.serverOnly)||!Array.isArray(runtime.browserVisible))throw new Error('Invalid private runtime contract');
 if(runtime.serverOnly.some(x=>x.startsWith('PUBLIC_'))||runtime.browserVisible.some(x=>!x.startsWith('PUBLIC_')))throw new Error('Server/browser environment boundary violated');
 if(!value.vercel.productionForbidden.includes(runtime.activation)||!value.vercel.productionForbidden.includes('PUBLIC_HUB_NOTES_PRIVATE'))throw new Error('Production fail-closed policy missing');
 for(const key of value.vercel.neverAllowed)if(runtime.browserVisible.includes(key)||runtime.serverOnly.includes(key))throw new Error('Forbidden credential declared as runtime variable');
 return value;
}
export function validateRepoPolicy(vercel){if(!object(vercel)||!object(vercel.git)||vercel.git.deploymentEnabled!==false)throw new Error('Automatic Vercel Git deployments must stay disabled');}
export async function validateFiles(){
 const files=['ops/vercel/thiepn-hub.json','ops/vercel/environment-contract.json','vercel.json'];
 const [product,env,vercel]=await Promise.all(files.map(async p=>JSON.parse(await fs.readFile(p,'utf8'))));
 validateProduct(product);validateEnvironmentContract(env);validateRepoPolicy(vercel);return{product,env};
}
if(import.meta.url==='file://'+process.argv[1]){const result=await validateFiles();console.log('Vercel product-family contract passed for '+result.product.projectName+'; '+result.env.vercel.productionForbidden.length+' production activation variables fail closed.');}
