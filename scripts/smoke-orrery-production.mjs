const BASE=process.env.ORRERY_URL||'https://thiepn.dev/orrery/';
const PRECISION=process.env.ORRERY_PRECISION_URL||'https://bskfihouwdogrunnglbg.supabase.co/functions/v1/orrery-precision';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,opts={},tries=12){let last;for(let i=0;i<tries;i++){try{const r=await fetch(url,{redirect:'follow',...opts});const text=await r.text();if(r.ok)return {r,text};last=new Error(r.status+' '+url+': '+text.slice(0,240));}catch(e){last=e;}if(i<tries-1)await sleep(5000);}throw last;}
function ok(x,m){if(!x)throw new Error(m);}
const page=await get(BASE);ok(/<title>The Orrery<\/title>/i.test(page.text),'title');ok(page.text.includes("APP_VERSION='2.0.1'"),'version');
ok(!/v2\.0\.0-alpha|v2\.0\.0-rc/i.test(page.text),'stale prerelease identity');
const manifest=JSON.parse((await get(new URL('manifest.webmanifest',BASE))).text);ok(manifest.name==='The Orrery','manifest');
const version=JSON.parse((await get(new URL('version.json',BASE))).text);ok(version.version==='2.0.1'&&version.release_channel==='stable','version json');
const sw=(await get(new URL('sw.js',BASE))).text;ok(sw.includes('orrery-v2.0.1-prod1'),'sw cache');
const health=await get(PRECISION+'/health',{headers:{Origin:'https://thiepn.dev'}},4);const hj=JSON.parse(health.text);ok(hj.ok===true,'precision health');ok((health.r.headers.get('access-control-allow-origin')||'')==='https://thiepn.dev','precision cors');
const o=new URL(PRECISION+'/observer');o.searchParams.set('target','699');o.searchParams.set('jd','2461313.5');o.searchParams.set('lat','50.94');o.searchParams.set('lon','6.96');o.searchParams.set('elev','0');const oj=JSON.parse((await get(o,{headers:{Origin:'https://thiepn.dev'}},3)).text);ok(oj.ok&&Number.isFinite(Number(oj.observer?.raDeg))&&Number.isFinite(Number(oj.observer?.rangeAu)),'JPL observer');
const geo=JSON.parse((await get('https://geocoding-api.open-meteo.com/v1/search?name=Cologne&count=1&language=en&format=json',{},3)).text);ok(Array.isArray(geo.results)&&geo.results.length,'Open-Meteo geocoding');
const g=geo.results[0];const wu=new URL('https://api.open-meteo.com/v1/forecast');wu.searchParams.set('latitude',g.latitude);wu.searchParams.set('longitude',g.longitude);wu.searchParams.set('hourly','cloud_cover,visibility,precipitation_probability,wind_speed_10m');wu.searchParams.set('forecast_days','1');wu.searchParams.set('timezone','auto');const w=JSON.parse((await get(wu,{},3)).text);ok(Array.isArray(w.hourly?.time)&&w.hourly.time.length,'Open-Meteo forecast');
console.log(JSON.stringify({ok:true,version:version.version,jpl:oj.signature||null,weatherTimezone:w.timezone||null},null,2));
