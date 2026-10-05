import { candidateRequestHeaders } from './candidate-request-headers.mjs';
const args=process.argv.slice(2);
const i=args.indexOf('--url');
const raw=i>=0?args[i+1]:process.env.VERCEL_DEPLOYMENT_URL;
if(!raw)throw new Error('Candidate URL is required');
const base=new URL(raw);
if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!base.hostname.endsWith('.vercel.app'))throw new Error('Use a clean Vercel candidate origin');
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
async function read(path,init={},expected=200){
 const {headers:initHeaders,...requestInit}=init;
 const response=await fetch(new URL(path,base),{...requestInit,redirect:'error',signal:AbortSignal.timeout(10000),headers:candidateRequestHeaders({bypass,headers:initHeaders})});
 const text=await response.text();if(response.status!==expected)throw new Error(path+' returned '+response.status+', expected '+expected);return{response,text};
}
for(const path of ['/','/home/','/search/','/inbox/']){const {text}=await read(path);if(!/<main\b/i.test(text)||!/THIEPN/i.test(text))throw new Error(path+' missing Hub identity');}
const release=JSON.parse((await read('/hub-release.json')).text);
if(release.profile!=='public-handoffs'||release.privateReadsEnabled===true||release.inlineWritesEnabled===true)throw new Error('Candidate release profile is unsafe');
for(const path of ['/api/v1/private/hub/notes/access','/api/hub/notes/v1']){const r=await read(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},503);const value=JSON.parse(r.text);if(value?.error?.code!=='HUB_PRIVATE_DISABLED')throw new Error(path+' did not fail closed');}
console.log('THIEPN Hub production-config release candidate passed at '+base.origin+'; private runtime remains disabled.');
