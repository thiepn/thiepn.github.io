import {validateDocument,type OfficeDocument} from './documents';
function canonical(v:unknown):unknown {
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)]));
 return v;
}
const bytes=new TextEncoder();
async function hash(v:unknown):Promise<string>{
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.encode(JSON.stringify(canonical(v))))),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function standaloneOfficeBackup(scope:string,documents:readonly OfficeDocument[],exportedAt=new Date().toISOString()):Promise<string>{
 if(!/^(guest|user:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(scope)||!documents.length||documents.length>100)throw Error('Choose a valid nonempty Office source scope.');
 const records:OfficeDocument[]=JSON.parse(JSON.stringify(documents));const ids=new Set<string>();
 for(const raw of records){const d=validateDocument(raw);if(ids.has(d.id))throw Error('Duplicate document ID.');ids.add(d.id);let prev=-1;for(const h of d.history){if(h.revision<=prev)throw Error('Unordered revision history. Export the existing Hub backup for manual recovery.');prev=h.revision;}}
 const fingerprints=await Promise.all(records.map(async d=>({id:d.id,revision:d.revision,document:await hash(d),history:await Promise.all(d.history.map(async h=>({revision:h.revision,sha256:await hash(h)})))})));
 const payload={kind:'thiepn-office-portable-backup',version:1,source:'hub',scope,exportedAt,records,fingerprints};
 const json=JSON.stringify({...payload,sha256:await hash(payload)});
 if(bytes.encode(json).length>16000000)throw Error('Portable backup exceeds 16 MB. Existing Hub backup remains available.');
 return json;
}
