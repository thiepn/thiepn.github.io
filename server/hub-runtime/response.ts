export type PrivateErrorCode='HUB_AUTH_REQUIRED'|'HUB_AUTH_INVALID'|'HUB_AUTH_UNAVAILABLE'|'HUB_ORIGIN_DENIED'|'HUB_BAD_REQUEST'|'HUB_PAYLOAD_TOO_LARGE'|'HUB_PRIVATE_DISABLED'|'HUB_PRIVATE_UNAVAILABLE'|'HUB_TIMEOUT';
const messages:Record<PrivateErrorCode,string>={
  HUB_AUTH_REQUIRED:'Authentication required',HUB_AUTH_INVALID:'Authentication invalid',HUB_AUTH_UNAVAILABLE:'Authentication service unavailable',
  HUB_ORIGIN_DENIED:'Origin not allowed',HUB_BAD_REQUEST:'Invalid request',HUB_PAYLOAD_TOO_LARGE:'Payload too large',
  HUB_PRIVATE_DISABLED:'Private Hub runtime disabled',HUB_PRIVATE_UNAVAILABLE:'Private Hub data unavailable',HUB_TIMEOUT:'Request timed out'
};
function headers(request:Request,id:string){
  const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Request-Id':id,Vary:'Authorization, Origin'});
  const origin=request.headers.get('origin');
  if(origin&&origin===new URL(request.url).origin)h.set('Access-Control-Allow-Origin',origin);
  return h;
}
export function requestId(request:Request){const incoming=request.headers.get('x-request-id')??'';return /^[A-Za-z0-9:_-]{8,128}$/.test(incoming)?incoming:crypto.randomUUID();}
export function sameOriginAllowed(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export function failure(request:Request,id:string,code:PrivateErrorCode,status:number){return new Response(JSON.stringify({ok:false,error:{code,message:messages[code],requestId:id}}),{status,headers:headers(request,id)});}
export function success<T>(request:Request,id:string,data:T){return new Response(JSON.stringify({ok:true,data,meta:{requestId:id}}),{status:200,headers:headers(request,id)});}
export function privateJson(request:Request,id:string,value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:headers(request,id)});}
