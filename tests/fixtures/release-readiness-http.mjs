const scenario=process.env.THIEPN_RELEASE_TEST_FIXTURE;
if(!scenario) throw Error('Provider fixture may only be used in an explicit local test');
const shaByApp={tms60:'12343b974417c3ba23b64f592961c151e52f7ede','roomtone-karaoke':'0503e5c500d9e69f72cb75d3ed1e04d49ed8fd35'};
const metadata={
 tms60:{name:'tms60',production_branch:'chore/cloudflare-pages-migration-readiness',
  domains:['tms60.pages.dev','tms60.thiepn.dev'],source:{type:'github',config:{owner:'thiepn',repo_name:'tms60'}}},
 'roomtone-karaoke':{name:'roomtone-karaoke',production_branch:'main',
  domains:['roomtone-karaoke.pages.dev','karaoke.thiepn.dev'],source:{type:'github',config:{owner:'thiepn',repo_name:'karaoke'}}}
};
const deployments={
 tms60:[{id:'24c8b827-b6a8-42bc-8c16-a2b1c14ed4be',environment:'production',
  created_on:'2026-10-17T20:11:20.792378Z',latest_stage:{status:'success'},
  deployment_trigger:{metadata:{branch:metadata.tms60.production_branch,commit_hash:shaByApp.tms60}}}],
 'roomtone-karaoke':[{id:'2995c7f3-94a9-4385-8cb0-05f2a165981e',environment:'production',
  created_on:'2026-10-19T10:38:51.342594Z',latest_stage:{status:'success'},
  deployment_trigger:{metadata:{branch:'main',commit_hash:shaByApp['roomtone-karaoke']}}}]
};
const tmsRuns=[
 ['account-srcdoc-oauth-regression.yml',39065569676],
 ['cloudflare-pages-migration-readiness.yml',39065569813],
 ['pwa-webapk-diagnostic.yml',39065569732],
 ['supabase-account-sync-regression.yml',39065569705],
 ['hub-integration.yml',39065569694]
].map(([workflow,id])=>({id,head_sha:shaByApp.tms60,
 path:'.github/workflows/'+workflow,status:'completed',conclusion:'success'}));
const tmsJobs=[{
  id:882100,name:'staged-static-check',status:'completed',conclusion:'success',
  steps:[
    {name:'Source and migration regressions',status:'completed',conclusion:'success'},
    {name:'Build public-only static artifact',status:'completed',conclusion:'success'},
    {name:'Locally test staged desktop and mobile Chromium',status:'completed',conclusion:'success'}
  ]
}];
const data=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
const app=scenario.includes('karaoke')?'roomtone-karaoke':'tms60';
globalThis.fetch=async (raw,options={})=>{
 if(options.method && options.method!=='GET')throw Error('Unexpected mutation attempted: '+options.method);
 const url=new URL(String(raw));
 if(scenario==='offline')throw Error('Mock network inaccessible');
 if(url.hostname==='api.cloudflare.com'){
  const root='/client/v4/accounts/fixture-account/pages/projects/'+app;
  if(url.pathname===root){
    const p=structuredClone(metadata[app]);
    if(scenario==='wrong-repository')p.source.config.repo_name='untrusted';
    return data({success:true,result:p});
  }
  if(url.pathname===root+'/deployments'){
    if(url.searchParams.get('env')!=='production')throw Error('Cloudflare provider request did not restrict to production');
    return data({success:true,result:deployments[app],result_info:{page:1,per_page:25,count:1,total_count:1,total_pages:1}});
  }
  throw Error('Unrecognised Cloudflare API request: '+url);
 }
 if(url.hostname==='api.github.com'){
  if(url.pathname==='/repos/thiepn/tms60/actions/runs'){
    if(url.searchParams.get('head_sha')!==shaByApp.tms60)throw Error('CI request lacks exact deployed SHA');
    return data({workflow_runs:tmsRuns,total_count:tmsRuns.length});
  }
  if(url.pathname==='/repos/thiepn/tms60/actions/runs/39065569813/jobs'){
    const jobs=structuredClone(tmsJobs);
    if(scenario==='ci-skipped') jobs[0].steps[2].conclusion='skipped';
    if(scenario==='ci-partial') jobs[0].steps[2].status='in_progress';
    if(scenario==='ci-job-missing') return data({jobs:[],total_count:0});
    return data({jobs,total_count:jobs.length});
  }
  throw Error('Unexpected GitHub request: '+url);
 }
 if(url.hostname===new URL(app==='tms60'?'https://tms60.thiepn.dev/':'https://karaoke.thiepn.dev/').hostname){
  const title=app==='tms60'?'TMS 60':'ROOMTONE';
  return new Response('<!doctype html><html><head><title>'+title+'</title></head><body><h1>'+title+'</h1></body></html>',{
   status:scenario==='http-failure'?500:200,headers:{'content-type':'text/html'}});
 }
 throw Error('Unrecognised remote origin: '+url);
};
