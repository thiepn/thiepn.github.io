const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type HubServerEnv={accountUrl:string;publishableKey:string;oauthClientId:string;enabled:true};
export function readHubServerEnv(source:NodeJS.ProcessEnv=process.env):HubServerEnv|null{
  if(source.THIEPN_HUB_PRIVATE_RUNTIME!=='staged-v1')return null;
  const rawUrl=source.THIEPN_ACCOUNT_URL??'',publishableKey=source.THIEPN_ACCOUNT_PUBLISHABLE_KEY??'',oauthClientId=source.THIEPN_HUB_OAUTH_CLIENT_ID??'';
  try{
    const url=new URL(rawUrl);
    if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||!url.hostname.endsWith('.supabase.co'))return null;
    if(!/^sb_publishable_[A-Za-z0-9_-]{16,256}$/.test(publishableKey)||!UUID.test(oauthClientId))return null;
    return{accountUrl:url.origin,publishableKey,oauthClientId,enabled:true};
  }catch{return null;}
}
export const validUuid=(value:unknown):value is string=>typeof value==='string'&&UUID.test(value);
