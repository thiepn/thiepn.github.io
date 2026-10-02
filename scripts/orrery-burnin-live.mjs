import fs from 'node:fs';

const BASE=process.env.ORRERY_URL||'https://thiepn.dev/orrery/';
const PRECISION=process.env.ORRERY_PRECISION_URL||'https://bskfihouwdogrunnglbg.supabase.co/functions/v1/orrery-precision';
const EXPECTED_VERSION=process.env.ORRERY_EXPECTED_VERSION||'2.0.1';
const EXPECTED_CACHE='orrery-v2.0.1-prod1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={startedAt:new Date().toISOString(),version:EXPECTED_VERSION,checks:[],timingsMs:{}};

function assert(cond,msg){if(!cond)throw new Error(msg);}
async function get(name,url,opts={},tries=3){
  let last;
  for(let i=0;i<tries;i++){
    const t=Date.now();
    try{
      const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),...opts});
      const text=await res.text();
      report.timingsMs[name]=Date.now()-t;
      if(res.ok){report.checks.push({name,ok:true,status:res.status});return {res,text};}
      last=new Error(`${res.status} ${url}: ${text.slice(0,240)}`);
    }catch(e){last=e;}
    if(i<tries-1)await sleep(1500*(i+1));
  }
  report.checks.push({name,ok:false,error:String(last)});
  throw last;
}

async function main(){
  const page=await get('production-html',BASE,{},4);
  assert(/<title>The Orrery<\/title>/i.test(page.text),'production title missing');
  assert(page.text.includes(`APP_VERSION='${EXPECTED_VERSION}'`),'production APP_VERSION mismatch');
  assert(!/v2\.0\.0-alpha|v2\.0\.0-rc/i.test(page.text),'stale prerelease identity is still visible');

  const manifest=JSON.parse((await get('manifest',new URL('manifest.webmanifest',BASE))).text);
  assert(manifest.name==='The Orrery','manifest name mismatch');
  assert(manifest.start_url==='.'||manifest.start_url==='./','manifest start_url mismatch');

  const version=JSON.parse((await get('version-json',new URL('version.json',BASE))).text);
  assert(version.version===EXPECTED_VERSION,'version.json mismatch');
  assert(version.release_channel==='stable','release channel is not stable');

  const sw=(await get('service-worker',new URL('sw.js',BASE))).text;
  assert(sw.includes(EXPECTED_CACHE),'service-worker cache mismatch');

  const health=await get('precision-health',PRECISION+'/health',{headers:{Origin:'https://thiepn.dev'}},4);
  const healthJson=JSON.parse(health.text);
  assert(healthJson.ok===true,'precision health failed');
  assert((health.res.headers.get('access-control-allow-origin')||'')==='https://thiepn.dev','precision CORS mismatch');

  const observer=new URL(PRECISION+'/observer');
  observer.searchParams.set('target','699');
  observer.searchParams.set('jd','2461313.5');
  observer.searchParams.set('lat','50.94');
  observer.searchParams.set('lon','6.96');
  observer.searchParams.set('elev','0');
  const oj=JSON.parse((await get('precision-jpl-saturn',observer,{headers:{Origin:'https://thiepn.dev'}},4)).text);
  assert(oj.ok===true&&/NASA\/JPL Horizons/i.test(oj.source||''),'JPL source mismatch');
  assert(Number.isFinite(Number(oj.observer?.raDeg)),'JPL RA missing');
  assert(Number.isFinite(Number(oj.observer?.decDeg)),'JPL Dec missing');
  assert(Number.isFinite(Number(oj.observer?.rangeAu)),'JPL range missing');

  const lookup=JSON.parse((await get('precision-lookup',PRECISION+'/lookup?q=Apophis',{headers:{Origin:'https://thiepn.dev'}},3)).text);
  assert(lookup.ok===true&&Array.isArray(lookup.results)&&lookup.results.length>0,'Horizons lookup contract failed');

  const geo=JSON.parse((await get('open-meteo-geocoding','https://geocoding-api.open-meteo.com/v1/search?name=Cologne&count=1&language=en&format=json',{},3)).text);
  assert(Array.isArray(geo.results)&&geo.results.length>0,'Open-Meteo geocoding contract failed');
  const g=geo.results[0];
  assert(Number.isFinite(Number(g.latitude))&&Number.isFinite(Number(g.longitude)),'Open-Meteo coordinates missing');
  assert(typeof g.timezone==='string'&&g.timezone.includes('/'),'Open-Meteo timezone missing');

  const weather=new URL('https://api.open-meteo.com/v1/forecast');
  weather.searchParams.set('latitude',g.latitude);
  weather.searchParams.set('longitude',g.longitude);
  weather.searchParams.set('hourly','cloud_cover,visibility,precipitation_probability,wind_speed_10m');
  weather.searchParams.set('forecast_days','1');
  weather.searchParams.set('timezone','auto');
  const w=JSON.parse((await get('open-meteo-weather',weather,{},3)).text);
  assert(Array.isArray(w.hourly?.time)&&w.hourly.time.length>0,'Open-Meteo hourly forecast missing');
  assert(Array.isArray(w.hourly?.cloud_cover),'Open-Meteo cloud-cover field missing');

  report.ok=true;
  report.finishedAt=new Date().toISOString();
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/orrery-burnin.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}

main().catch(err=>{
  report.ok=false;report.finishedAt=new Date().toISOString();report.error=String(err?.stack||err);
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/orrery-burnin.json',JSON.stringify(report,null,2)+'\n');
  console.error(report.error);
  process.exit(1);
});
