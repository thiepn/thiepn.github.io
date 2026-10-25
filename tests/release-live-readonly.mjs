// Anonymous read-only load smoke. No credentials, clicks, form submissions, or API mutations.
import { chromium } from 'playwright';

const targets = [
  { id:'tms60',url:'https://tms60.thiepn.dev/' },
  { id:'clean30',url:'https://thiepn.dev/clean30/' },
  { id:'pdf-studio',url:'https://thiepn.dev/pdf/' },
  { id:'tiny-tools',url:'https://thiepn.dev/tools/' },
  { id:'recipe',url:'https://recipe.thiepn.dev/' },
];
const sizes=[{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}];
let failures=0;
const browser=await chromium.launch({headless:true});
try {
  for(const target of targets) for(const size of sizes) {
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},serviceWorkers:'block',acceptDownloads:false});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message.slice(0,160)));
    try {
      const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForTimeout(600);
      const title=await page.title();
      const html=await page.locator('html').count();
      const status=response?.status()??0;
      const verdict=status>=200&&status<400&&title.trim().length>0&&html===1?'LOAD_OK':'LOAD_FAIL';
      console.log(JSON.stringify({appId:target.id,device:size.name,status,title:title.slice(0,120),html,verdict,pageErrors:errors}));
      if(verdict!=='LOAD_OK') failures++;
    } catch(error) {
      failures++;
      console.log(JSON.stringify({appId:target.id,device:size.name,verdict:'NOT_TESTED_OR_FAILED',reason:String(error).slice(0,300)}));
    } finally {await context.close();}
  }
} finally {await browser.close();}
if(failures) {
 console.error(`Live anonymous smoke had ${failures} unresolved loading outcomes; no release certification implied.`);
 process.exitCode=1;
}
