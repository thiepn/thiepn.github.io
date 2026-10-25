// Diagnostic reproduction of the UNCHANGED original controller assertion.
// Runs only against the pinned TMS60 source on an ephemeral localhost origin.
// An eventual controller does not turn an initially uncontrolled old tab into PASS.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
const source=process.cwd();
const require=createRequire(join(source,'package.json'));
const {chromium}=require('playwright');
const headersFor=file=>{
 const ext=extname(file);
 return {'content-type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[ext]||'application/octet-stream','cache-control':'no-store'};
};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/','http://localhost').pathname;
 const name=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
 if(!/^[a-z0-9._/-]+$/i.test(name)||name.includes('..')){res.writeHead(404);res.end();return;}
 try{
  const data=await readFile(join(source,name));
  res.writeHead(200,headersFor(name));res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
const samples=[],cycles=Number(process.env.TMS60_SW_RACE_CYCLES||8);
assert.ok(Number.isInteger(cycles)&&cycles>=2&&cycles<=15);
try{
 for(const mobile of [false,true]){
  for(let i=0;i<cycles;i++){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,serviceWorkers:'allow'});
   try{
    const page=await context.newPage();
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
    await page.evaluate(()=>{
      localStorage.setItem('tms60-onboarding-v2','1');
      localStorage.setItem('tms60-onboarding-v3','1');
      localStorage.setItem('tms60-active-translation-v1','esv');
      localStorage.setItem('tms60-ui-language-v1','en');
    });
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#app-frame.ready').waitFor({timeout:30000});
    const state=await page.evaluate(async()=>{
      const before=performance.now();
      const registration=await navigator.serviceWorker.ready;
      const snapshot=()=>({controlled:!!navigator.serviceWorker.controller,controllerUrl:navigator.serviceWorker.controller?.scriptURL||null,
        active:registration.active?.state||null,activeUrl:registration.active?.scriptURL||null,installing:registration.installing?.state||null,
        waiting:registration.waiting?.state||null,scope:registration.scope,elapsedMs:Math.round(performance.now()-before)});
      const immediate=snapshot();
      const fromSource=await(await fetch('/app.html')).text();
      const afterFetch=snapshot();
      if(!immediate.controlled){
       await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise(resolve=>setTimeout(resolve,1200))]);
      }
      return {immediate,afterFetch,eventual:snapshot(),sourceShell:fromSource.includes('TMS Memory Lab')};
    });
    const row={device:mobile?'mobile':'desktop',iteration:i+1,...state,assertionControlledAfterReady:state.afterFetch.controlled};
    samples.push(row);console.log('SW_RACE_SAMPLE '+JSON.stringify(row));
   }catch(error){
    samples.push({device:mobile?'mobile':'desktop',iteration:i+1,error:String(error).slice(0,350)});
    console.log('SW_RACE_ERROR '+JSON.stringify(samples.at(-1)));
   }finally{await context.close();}
  }
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
const missed=samples.filter(x=>!x.assertionControlledAfterReady);
console.log('SW_RACE_SUMMARY '+JSON.stringify({sourceRevision:'12343b974417c3ba23b64f592961c151e52f7ede',cyclesPerDevice:cycles,observations:samples.length,uncontrolledImmediatelyAfterReady:samples.filter(x=>x.immediate&&!x.immediate.controlled).length,violations:missed.length}));
assert.equal(missed.length,0,'Original "Previous worker controls source generation" assertion fails in one or more repetitions; no eventual-controller waiver');
