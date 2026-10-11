import { handleH21Request, type H21Environment } from '../../src/lib/prism/home-h21-cloudflare-worker';

// Only this test-only Wrangler entrypoint accepts synthetic public keys.
// It is never imported by the production Hub or production Worker entrypoint.
interface LocalEnvironment extends H21Environment { H21_TEST_PUBLIC_JWK?: string }
const issuer='https://h21-disposable.invalid/auth/v1';
function decode(s:string):Uint8Array {
  const normalized=s.replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
async function verifyLocalJwt(token:string,pub:string|undefined):Promise<string|null> {
  if(!pub || token.length>8000 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token))return null;
  try {
    const [h,p,s]=token.split('.');
    const header=JSON.parse(new TextDecoder().decode(decode(h!)));
    const claims=JSON.parse(new TextDecoder().decode(decode(p!)));
    if(header.alg!=='ES256'||header.typ!=='JWT'||claims.iss!==issuer||
       claims.aud!=='authenticated'||claims.role!=='authenticated'||
       claims.is_anonymous===true || typeof claims.sub!=='string' ||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub) ||
       !Number.isInteger(claims.exp)||claims.exp<=Date.now()/1000 ||
       !Number.isInteger(claims.iat)||claims.iat>Date.now()/1000+60)return null;
    const jwk=JSON.parse(pub);
    if(jwk.kty!=='EC'||jwk.crv!=='P-256'||jwk.d || jwk.alg && jwk.alg!=='ES256')return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const bytes=new TextEncoder().encode(h+'.'+p);
    if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(s!),bytes))return null;
    return claims.sub.toLowerCase();
  }catch{return null;}
}
export default { fetch(request:Request,env:LocalEnvironment):Promise<Response> {
  return handleH21Request(request,env,token=>verifyLocalJwt(token,env.H21_TEST_PUBLIC_JWK));
} };
