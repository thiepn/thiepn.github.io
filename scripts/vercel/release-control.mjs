import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const confirmations={promote:'PROMOTE thiepn-hub',rollback:'ROLLBACK thiepn-hub'};
const arg=name=>{const i=process.argv.indexOf('--'+name);return i>=0?process.argv[i+1]:undefined;};
export function validateSourceSha(value){if(typeof value!=='string'||!/^[0-9a-f]{40}$/.test(value))throw new Error('source_sha must be a full lowercase commit SHA');return value;}
export function validateDeploymentUrl(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!url.hostname.endsWith('.vercel.app'))throw new Error('deployment_url must be a clean Vercel HTTPS origin');return url.origin;}
export function validateConfirmation(action,value){const expected=confirmations[action];if(!expected||value!==expected)throw new Error('Confirmation must equal "'+(expected??'unsupported')+'"');return value;}
export async function writeRecord({action,sourceSha,deploymentUrl,projectId,projectName,qualificationPath='.cache/hub-release-qualification.json'}){
 if(!['candidate','promote','rollback'].includes(action))throw new Error('Invalid release action');validateSourceSha(sourceSha);deploymentUrl=validateDeploymentUrl(deploymentUrl);
 if(typeof projectId!=='string'||!/^prj_[A-Za-z0-9]+$/.test(projectId)||projectName!=='thiepn-hub')throw new Error('Invalid Vercel project identity');
 const bytes=await fs.readFile(qualificationPath);const qualification=JSON.parse(bytes.toString());
 if(qualification.schemaVersion!==1||qualification.profile!=='public-handoffs'||!Array.isArray(qualification.builtAssets))throw new Error('Invalid Hub qualification report');
 const record={schemaVersion:1,productId:'hub',projectName,projectId,action,sourceSha,deploymentUrl,releaseId:qualification.releaseId,artifactCount:qualification.builtAssets.length,qualificationSha256:crypto.createHash('sha256').update(bytes).digest('hex'),recordedAt:new Date().toISOString()};
 await fs.mkdir('.cache',{recursive:true});await fs.writeFile('.cache/vercel-release-record.json',JSON.stringify(record,null,2)+'\n');return record;
}
async function main(){
 const command=process.argv[2];
 if(command==='validate-input'){const action=arg('action'),sha=arg('sha'),url=arg('url'),confirm=arg('confirm');validateSourceSha(sha);validateDeploymentUrl(url);validateConfirmation(action,confirm);console.log('Controlled '+action+' input accepted for '+sha.slice(0,12)+'.');return;}
 if(command==='record'){const record=await writeRecord({action:arg('action'),sourceSha:arg('sha'),deploymentUrl:arg('url'),projectId:arg('project-id'),projectName:arg('project-name')});console.log('Recorded '+record.action+' evidence for '+record.deploymentUrl+'.');return;}
 throw new Error('Use validate-input or record');
}
if(import.meta.url==='file://'+process.argv[1])await main();
