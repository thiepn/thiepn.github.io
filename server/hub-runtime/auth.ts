import type{HubServerEnv}from'./env.js';import{validUuid}from'./env.js';import{readBoundedJson}from'./bounded-json.js';
export type ManagedIdentity={userId:string;bearer:string;expiresAt:number;sessionId:string};
type VerifyOptions={http?:typeof fetch;now?:()=>number};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function decodeClaims(token:string):Record<string,unknown>{
  const parts=token.split('.');if(parts.length!==3)throw new Error('invalid');
  const value:unknown=JSON.parse(Buffer.from(parts[1]!,'base64url').toString('utf8'));
  if(!object(value))throw new Error('invalid');return value;
}
export async function verifyManagedBearer(request:Request,env:HubServerEnv,signal:AbortSignal,options:VerifyOptions={}):Promise<ManagedIdentity>{
  const header=request.headers.get('authorization')?.trim()??'',match=/^Bearer ([A-Za-z0-9._~-]{16,8192})$/.exec(header);
  if(!match)throw new Error('required');
  const bearer=match[1]!,http=options.http??fetch,now=options.now??Date.now;
  let response:Response;
  try{response=await http(new URL('/auth/v1/user',env.accountUrl),{method:'GET',headers:{Accept:'application/json',apikey:env.publishableKey,Authorization:'Bearer '+bearer},redirect:'error',signal});}
  catch{throw new Error('unavailable');}
  if(response.status===401||response.status===403)throw new Error('invalid');
  if(!response.ok)throw new Error('unavailable');
  let user:unknown;try{user=await readBoundedJson(response.body,65536,signal);}catch{throw new Error('unavailable');}
  if(!object(user))throw new Error('invalid');
  const userId=user.id;if(!validUuid(userId))throw new Error('invalid');
  let claims:Record<string,unknown>;try{claims=decodeClaims(bearer);}catch{throw new Error('invalid');}
  if(claims.sub!==userId||claims.iss!==env.accountUrl+'/auth/v1'||claims.aud!=='authenticated'||claims.role!=='authenticated'||claims.client_id!==env.oauthClientId||claims.is_anonymous===true||!validUuid(claims.session_id)||!Number.isSafeInteger(claims.exp)||Number(claims.exp)*1000<=now())throw new Error('invalid');
  return{userId,bearer,expiresAt:Number(claims.exp)*1000,sessionId:String(claims.session_id)};
}
