import crypto from 'node:crypto';
import { appendFileSync } from 'node:fs';

const API='https://api.vercel.com';

export function generateBypassSecret(){
  return crypto.randomBytes(16).toString('hex');
}

export async function updateProtectionBypass({action,token,projectId,secret,fetchImpl=fetch}){
  if(!token)throw new Error('VERCEL_TOKEN is required');
  if(!/^prj_[A-Za-z0-9]+$/.test(projectId??''))throw new Error('VERCEL_PROJECT_ID is invalid');
  if(!/^[A-Za-z0-9]{32}$/.test(secret??''))throw new Error('Automation bypass secret is invalid');
  const body=action==='generate'
    ? {generate:{secret,note:'THIEPN CI ephemeral release certification'}}
    : action==='revoke'
      ? {revoke:{secret,regenerate:false}}
      : null;
  if(!body)throw new Error('Unsupported protection-bypass action');
  const response=await fetchImpl(API+'/v1/projects/'+encodeURIComponent(projectId)+'/protection-bypass',{
    method:'PATCH',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(body),
    redirect:'error',
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok){
    await response.body?.cancel().catch(()=>{});
    throw new Error('Vercel automation protection-bypass update failed with HTTP '+response.status);
  }
  await response.body?.cancel().catch(()=>{});
}

async function main(){
  const command=process.argv[2];
  const token=process.env.VERCEL_TOKEN??'';
  const projectId=process.env.VERCEL_PROJECT_ID??'';
  if(command==='create'){
    const secret=generateBypassSecret();
    await updateProtectionBypass({action:'generate',token,projectId,secret});
    if(process.env.GITHUB_ENV){
      console.log('::add-mask::'+secret);
      appendFileSync(process.env.GITHUB_ENV,'VERCEL_AUTOMATION_BYPASS_SECRET='+secret+'\n','utf8');
    }
    console.log('Ephemeral Vercel automation bypass created for protected-deployment certification.');
    return;
  }
  if(command==='revoke'){
    const secret=process.env.VERCEL_AUTOMATION_BYPASS_SECRET??'';
    if(!secret){console.log('No automation bypass secret present; nothing to revoke.');return;}
    await updateProtectionBypass({action:'revoke',token,projectId,secret});
    console.log('Ephemeral Vercel automation bypass revoked.');
    return;
  }
  throw new Error('Use create or revoke');
}
if(import.meta.url==='file://'+process.argv[1])await main();
