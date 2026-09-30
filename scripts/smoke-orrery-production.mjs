const BASE = process.env.ORRERY_URL || 'https://thiepn.dev/orrery/';
const PRECISION = process.env.ORRERY_PRECISION_URL || 'https://bskfihouwdogrunnglbg.supabase.co/functions/v1/orrery-precision';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, opts={}, tries=12){
  let last;
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(url,{redirect:'follow',...opts});
      const text=await r.text();
      if(r.ok) return {r,text};
      last=new Error(`${r.status} ${url}: ${text.slice(0,300)}`);
    }catch(e){last=e;}
    if(i<tries-1) await sleep(5000);
  }
  throw last;
}
function assert(cond,msg){if(!cond)throw new Error(msg);}
const page=await get(BASE);
assert(/<title>The Orrery<\/title>/i.test(page.text),'Orrery title missing');
assert(page.text.includes('1.4.0'),'v1.4.0 marker missing');
assert(page.text.includes('orrery-precision'),'precision endpoint not wired');
const manifest=await get(new URL('manifest.webmanifest',BASE));
const mj=JSON.parse(manifest.text);
assert(mj.name==='The Orrery','manifest name mismatch');
assert(mj.start_url==='./','manifest start_url mismatch');
const sw=await get(new URL('sw.js',BASE));
assert(sw.text.includes("orrery-v1.4.0"),'service-worker cache version mismatch');
const health=await get(PRECISION+'/health',{headers:{Origin:'https://thiepn.dev'}},4);
const hj=JSON.parse(health.text);
assert(hj.ok===true,'precision health not ok');
assert((health.r.headers.get('access-control-allow-origin')||'')==='https://thiepn.dev','precision CORS mismatch');
const obsUrl=new URL(PRECISION+'/observer');
obsUrl.searchParams.set('target','699');
obsUrl.searchParams.set('jd','2461313.5');
obsUrl.searchParams.set('lat','50.9375');
obsUrl.searchParams.set('lon','6.9603');
obsUrl.searchParams.set('elev','0');
const obs=await get(obsUrl,{headers:{Origin:'https://thiepn.dev'}},3);
const oj=JSON.parse(obs.text);
assert(oj.ok===true,'Horizons observer request not ok');
assert(/NASA\/JPL Horizons/i.test(oj.source||''),'unexpected precision source');
assert(oj.observer && Number.isFinite(Number(oj.observer.raDeg)),'missing RA');
assert(oj.observer && Number.isFinite(Number(oj.observer.decDeg)),'missing Dec');
assert(oj.observer && Number.isFinite(Number(oj.observer.rangeAu)),'missing range');
console.log(JSON.stringify({
  ok:true,
  route:BASE,
  precision:PRECISION,
  target:oj.targetName||'Saturn',
  raDeg:oj.observer.raDeg,
  decDeg:oj.observer.decDeg,
  rangeAu:oj.observer.rangeAu,
  jplSignature:oj.signature||null
},null,2));
