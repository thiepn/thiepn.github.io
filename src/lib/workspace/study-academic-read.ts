/** C1 consumes only source-owned read projections; it never writes Hub WorkspaceState. */
export type AcademicRead = {
  generatedAt:string; expiresAt:string;semester:{id:string;name:string;timezone:string};
  coverage:{status:"complete"|"partial";reasons:string[];from:string;days:number};
  courses:{courseId:string;name:string;durableMasteryPercent:number|null;sourceHref:string|null}[];
  exams:{courseId:string;courseName:string;examAt:string;verification:"owner_configured";sourceHref:string|null}[];
  commitments:{commitmentId:string;title:string;kind:string;dueAt:string;estimatedMinutes:number;sourceHref:string|null}[];
  reviews:{dueSkillCount:number;actionableSkillCount:number;budgetMinutes:number;
    items:{skillId:string;courseId:string;title:string;actionable:boolean;sourceHref:string|null}[]};
};
export type AcademicState={kind:"disconnected"|"unconfigured"|"loading"|"setup_required"|"unavailable"}|{kind:"ready";data:AcademicRead};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const iso=(v:unknown)=>typeof v==="string"&&Number.isFinite(Date.parse(v));
const n=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const txt=(v:unknown,max=240)=>typeof v==="string"&&v.length<=max;
export function studyOrigin(v:unknown):string|null{
  if(!txt(v,130)||!v)return null;
  try{const u=new URL(v as string);return u.origin==="https://studyos.thiepn.dev"&&u.pathname==="/"&&!u.search&&!u.hash&&!u.username&&!u.password?u.origin:null}catch{return null}
}
export function studyAction(origin:string,path:unknown):string|null{
  if(!txt(path,250)||!(path as string).startsWith("/")||(path as string).startsWith("//"))return null;
  const u=new URL(path as string,origin);
  if(u.origin!==origin||u.hash||u.username||u.password)return null;
  if(/^\/courses\/[0-9a-f-]{36}$/i.test(u.pathname)&&!u.search)return u.href;
  if(u.pathname==="/courses"&&!u.search)return u.href;
  if(u.pathname==="/practice"&&[...u.searchParams.keys()].every(k=>k==="course")&&uuid(u.searchParams.get("course")))return u.href;
  return null;
}
export function parseAcademic(v:unknown,now=Date.now()):AcademicRead{
  if(!obj(v)||v.schema!=="study-hub-summary"||v.schemaVersion!==1||!iso(v.generatedAt)||!iso(v.expiresAt)||
    Date.parse(v.generatedAt as string)>now+60000||Date.parse(v.expiresAt as string)<=now||
    Date.parse(v.expiresAt as string)-Date.parse(v.generatedAt as string)>600000)throw Error("Invalid academic timestamp");
  const s=v.semester,c=v.coverage,r=v.reviews;
  if(!obj(s)||!uuid(s.id)||!txt(s.name,120)||!txt(s.timezone,80)||!obj(c)||
    !["complete","partial"].includes(String(c.status))||!Array.isArray(c.reasons)||c.reasons.length>15||
    c.reasons.some(x=>!txt(x,80))||!txt(c.from,10)||!n(c.days)||Number(c.days)>21||
    !Array.isArray(v.courses)||v.courses.length>30||!Array.isArray(v.exams)||v.exams.length>30||
    !Array.isArray(v.commitments)||v.commitments.length>100||!obj(r)||!n(r.dueSkillCount)||
    !n(r.actionableSkillCount)||!n(r.budgetMinutes)||!Array.isArray(r.items)||r.items.length>50)
    throw Error("Invalid academic scope");
  for(const x of v.courses){if(!obj(x)||!uuid(x.courseId)||!txt(x.name,160)||
    (x.durableMasteryPercent!==null&&(!n(x.durableMasteryPercent)||Number(x.durableMasteryPercent)>100)))throw Error("Invalid course")}
  for(const x of v.exams){if(!obj(x)||!uuid(x.courseId)||!txt(x.courseName,160)||!iso(x.examAt)||
    x.verification!=="owner_configured")throw Error("Invalid exam")}
  for(const x of v.commitments){if(!obj(x)||!uuid(x.commitmentId)||!txt(x.title)||!txt(x.kind,40)||
    !iso(x.dueAt)||!n(x.estimatedMinutes))throw Error("Invalid commitment")}
  for(const x of r.items){if(!obj(x)||!uuid(x.skillId)||!uuid(x.courseId)||!txt(x.title,160)||
    typeof x.actionable!=="boolean")throw Error("Invalid review")}
  return v as unknown as AcademicRead;
}
export async function fetchAcademic(origin:string,token:string,from:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
  if(!studyOrigin(origin)||!token||token.length>16384||!/^\d{4}-\d{2}-\d{2}$/.test(from))throw Error("No authorized academic read");
  const response=await fetcher(origin+"/api/hub/study/v1/summary?from="+encodeURIComponent(from)+"&days=7",{
    method:"GET",headers:{Accept:"application/json",Authorization:"Bearer "+token},
    credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",signal});
  if(!response.ok)throw Error("StudyOS source unavailable");
  if(Number(response.headers.get("content-length")||0)>150000)throw Error("StudyOS response exceeds limit");
  const bodyText=await response.text();if(new TextEncoder().encode(bodyText).length>150000)throw Error("StudyOS response exceeds limit");
  const body:unknown=JSON.parse(bodyText);
  if(!obj(body)||body.ok!==true)throw Error("StudyOS invalid response");
  if(body.status==="setup_required")return {kind:"setup_required" as const};
  if(body.status!=="ready")throw Error("StudyOS source status unavailable");
  return {kind:"ready" as const,data:parseAcademic(body.data)};
}
const esc=(x:unknown)=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function renderAcademic(state:AcademicState,origin:string|null,mode:"today"|"week"):string{
  const head='<section class="ws-surface ws-study-c1" aria-label="StudyOS academic overview"><header><div><small>StudyOS · original academic records</small><h2>'+
    (mode==="week"?"Academic week":"University today")+'</h2></div>';
  if(state.kind!=="ready"){
    const message=state.kind==="unconfigured"?"StudyOS origin is not configured. No academic data was queried.":
      state.kind==="disconnected"?"Authorize a temporary view of your academic records.":
      state.kind==="loading"?"Reading authorized StudyOS records…":
      state.kind==="setup_required"?"No active StudyOS semester. Configure the original academic workspace.":
      "Academic data is unavailable; this is not confirmation that no exams or assignments exist.";
    return head+(state.kind==="loading"||state.kind==="unconfigured"?"":'<button data-action="study-connect" type="button">Connect / Retry StudyOS</button>')+
      '</header><p>'+esc(message)+'</p></section>';
  }
  const x=state.data;
  const list=(items:{title:string;detail:string;href:string|null}[],empty:string)=>items.length?
    '<ul>'+items.map(i=>'<li><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.detail)+'</small></div>'+
    (i.href?'<a href="'+esc(i.href)+'" rel="noreferrer">Open source</a>':'')+'</li>').join("")+'</ul>':'<p>'+esc(empty)+'</p>';
  const a=(p:string|null)=>origin&&p?studyAction(origin,p):null;
  const ex=x.exams.slice(0,5).map(e=>({title:e.courseName,detail:e.examAt.slice(0,16).replace("T"," ")+" · owner-configured date",href:a(e.sourceHref)}));
  const cs=x.commitments.slice(0,10).map(c=>({title:c.title,detail:c.kind+" · due "+c.dueAt.slice(0,16).replace("T"," ")+" · "+c.estimatedMinutes+" min",href:a(c.sourceHref)}));
  const rv=x.reviews.items.filter(r=>r.actionable).slice(0,4).map(r=>({title:r.title,detail:"Original eligible review · no mastery inferred",href:a(r.sourceHref)}));
  return head+'<button data-action="study-connect" type="button">Refresh</button>'+
    '<button data-action="study-disconnect" type="button">Disconnect</button></header>'+
    '<p>'+esc(x.semester.name)+" · "+esc(x.semester.timezone)+" · "+esc(x.coverage.status)+
    ' source coverage · no calendar reservations</p>'+
    (x.coverage.status==="partial"?'<p role="status">Source limitations: '+esc(x.coverage.reasons.join(", "))+'</p>':'')+
    '<div class="ws-study-c1-grid"><div><h3>Exams</h3>'+list(ex,"No configured exam dates shown; verify source.")+
    '</div><div><h3>Assignments ('+x.commitments.length+')</h3>'+list(cs,"No academic commitments in this bounded source.")+
    '</div><div><h3>Due reviews ('+x.reviews.dueSkillCount+')</h3>'+list(rv,"No eligible registered review action.")+
    '</div></div><small>Academic IDs, completion, grades and spaced-review authority remain in StudyOS.</small></section>';
}
