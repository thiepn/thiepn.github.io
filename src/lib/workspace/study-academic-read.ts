/** C1-B: owner-qualified, transient StudyOS projections. No WorkspaceState persistence or writes. */
export type AcademicCourse = {courseId:string;name:string;shortName:string|null;sortOrder:number;
  examAt:string|null;examVerification:"owner_configured"|"unknown";durableMasteryPercent:number|null;
  totalSkills:number|null;unresolvedErrors:number|null;sourceRoute:string|null};
export type AcademicExam = {courseId:string;courseName:string;examAt:string;
  verification:"owner_configured";sourceRoute:string|null};
export type AcademicCommitment = {commitmentId:string;courseId:string|null;resourceId:string|null;
  title:string;kind:string;dueAt:string;estimatedMinutes:number;priority:number;status:"open";
  originalUpdatedAt:string|null;calendarIdentity:{calendarId:string;eventId:string}|null;sourceRoute:string|null};
export type AcademicReview = {skillId:string;courseId:string;title:string;nextReviewAt:string|null;
  priorityScore:number;actionable:boolean|null;sourceRoute:string|null};
export type AcademicRead = {schema:"study-hub-summary";schemaVersion:1;
  generatedAt:string;expiresAt:string;semester:{id:string;name:string;timezone:string};
  coverage:{status:"complete"|"partial";reasons:string[];from:string;days:number;
    truncated:boolean;calendarCoverage:"not_included";academicCandidates:"not_published"};
  courses:AcademicCourse[];exams:AcademicExam[];commitments:AcademicCommitment[];
  reviews:{dueSkillCount:number;actionableSkillCount:number;budgetMinutes:number;items:AcademicReview[]};
  candidates:unknown[]};
export type AcademicState =
  {kind:"disconnected"|"unconfigured"|"signed-out"|"loading"|"setup_required"|"unavailable"|"stale"} |
  {kind:"ready";data:AcademicRead};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const date=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  Number.isFinite(Date.parse(v+"T12:00:00Z"))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const instant=(v:unknown):v is string=>typeof v==="string"&&Number.isFinite(Date.parse(v));
const str=(v:unknown,max=240)=>typeof v==="string"&&v.length<=max;
const number=(v:unknown,max=1e8)=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=max;
const optional=(v:unknown,ok:(v:unknown)=>boolean)=>v===null||ok(v);
function zoneValid(zone:string){try{new Intl.DateTimeFormat("en-GB",{timeZone:zone});return true}catch{return false}}
const esc=(x:unknown)=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
/** The current verified StudyOS owner origin is study.thiepn.dev, not the obsolete studyos subdomain. */
export function studyOrigin(v:unknown):string|null{
  if(!str(v,130)||!v)return null;
  try{const u=new URL(v);return u.origin==="https://study.thiepn.dev"&&u.pathname==="/"&&!u.search&&
    !u.hash&&!u.username&&!u.password?u.origin:null}catch{return null}
}
/** All owner-provided actions must stay within known, original StudyOS screens. */
export function studyAction(origin:string,path:unknown):string|null{
  if(!studyOrigin(origin)||!str(path,320)||!path.startsWith("/")||path.startsWith("//"))return null;
  try{
    const u=new URL(path,origin);
    if(u.origin!==origin||u.hash||u.username||u.password)return null;
    if((u.pathname==="/courses"||/^\/courses\/[0-9a-f-]{36}$/i.test(u.pathname))&&!u.search){
      if(u.pathname!=="/courses"&&!uuid(u.pathname.slice(9)))return null;
      return u.href;
    }
    if(u.pathname==="/practice"&&u.searchParams.size===3&&
      u.searchParams.get("mode")==="repair"&&uuid(u.searchParams.get("course"))&&
      uuid(u.searchParams.get("skill"))&&
      ["course","mode","skill"].every(k=>u.searchParams.getAll(k).length===1))return u.href;
    return null;
  }catch{return null}
}
export function localAcademicDay(value:string,zone:string):string{
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
  return ["year","month","day"].map(k=>parts.find(x=>x.type===k)!.value).join("-");
}
export function addAcademicDays(day:string,offset:number):string{
  if(!date(day)||!Number.isInteger(offset)||Math.abs(offset)>366)throw Error("Invalid academic day");
  const v=new Date(day+"T12:00:00Z");v.setUTCDate(v.getUTCDate()+offset);return v.toISOString().slice(0,10);
}
export function academicWeekStart(day:string):string{
  if(!date(day))throw Error("Invalid academic week");
  const weekday=new Date(day+"T12:00:00Z").getUTCDay();
  return addAcademicDays(day,-((weekday+6)%7));
}
export function parseAcademic(v:unknown,now=Date.now()):AcademicRead{
  if(!obj(v)||v.schema!=="study-hub-summary"||v.schemaVersion!==1||!instant(v.generatedAt)||
    !instant(v.expiresAt)||Date.parse(v.generatedAt)>now+60000||
    Date.parse(v.expiresAt)<=now||Date.parse(v.expiresAt)<=Date.parse(v.generatedAt)||
    Date.parse(v.expiresAt)-Date.parse(v.generatedAt)>600000)throw Error("Invalid academic timestamp");
  const s=v.semester,c=v.coverage,r=v.reviews;
  if(!obj(s)||!uuid(s.id)||!str(s.name,120)||!str(s.timezone,80)||!zoneValid(s.timezone)||
    !obj(c)||!["complete","partial"].includes(String(c.status))||
    !Array.isArray(c.reasons)||c.reasons.length>16||c.reasons.some(x=>!str(x,80))||
    !date(c.from)||!Number.isSafeInteger(c.days)||c.days<1||c.days>21||
    c.truncated!==(c.reasons.length>0)||c.status!==(c.reasons.length?"partial":"complete")||
    c.calendarCoverage!=="not_included"||c.academicCandidates!=="not_published"||
    !Array.isArray(v.candidates)||v.candidates.length!==0||
    !Array.isArray(v.courses)||v.courses.length>30||!Array.isArray(v.exams)||v.exams.length>30||
    !Array.isArray(v.commitments)||v.commitments.length>100||!obj(r)||
    !Number.isSafeInteger(r.dueSkillCount)||!number(r.dueSkillCount)||
    !Number.isSafeInteger(r.actionableSkillCount)||!number(r.actionableSkillCount)||
    !number(r.budgetMinutes,10000)||!Array.isArray(r.items)||r.items.length>50||
    r.actionableSkillCount>r.items.length||r.dueSkillCount<r.items.length)throw Error("Invalid academic scope");
  const courses=new Set<string>(),commitments=new Set<string>(),skills=new Set<string>();
  for(const x of v.courses){
    if(!obj(x)||!uuid(x.courseId)||courses.has(x.courseId)||!str(x.name,160)||
      !optional(x.shortName,y=>str(y,120))||!number(x.sortOrder,100000)||
      !optional(x.examAt,instant)||!["owner_configured","unknown"].includes(String(x.examVerification))||
      (x.examAt!==null&&x.examVerification!=="owner_configured")||
      !optional(x.durableMasteryPercent,y=>number(y,100))||
      !optional(x.totalSkills,y=>Number.isSafeInteger(y)&&number(y))||
      !optional(x.unresolvedErrors,y=>Number.isSafeInteger(y)&&number(y))||
      !optional(x.sourceRoute,y=>str(y,320)&&studyAction("https://study.thiepn.dev",y)!==null))
      throw Error("Invalid academic course");
    courses.add(x.courseId);
  }
  for(const x of v.exams){
    if(!obj(x)||!uuid(x.courseId)||!courses.has(x.courseId)||!str(x.courseName,160)||
      !instant(x.examAt)||x.verification!=="owner_configured"||
      !optional(x.sourceRoute,y=>str(y,320)&&studyAction("https://study.thiepn.dev",y)!==null))
      throw Error("Invalid academic exam");
  }
  for(const x of v.commitments){
    if(!obj(x)||!uuid(x.commitmentId)||commitments.has(x.commitmentId)||
      !optional(x.courseId,y=>uuid(y)&&courses.has(y))||
      !optional(x.resourceId,uuid)||!str(x.title)||!str(x.kind,40)||!instant(x.dueAt)||
      !number(x.estimatedMinutes)||!number(x.priority)||x.status!=="open"||
      !optional(x.originalUpdatedAt,instant)||
      !optional(x.calendarIdentity,y=>obj(y)&&str(y.calendarId,250)&&str(y.eventId,250))||
      !optional(x.sourceRoute,y=>str(y,320)&&studyAction("https://study.thiepn.dev",y)!==null))
      throw Error("Invalid academic commitment");
    commitments.add(x.commitmentId);
  }
  for(const x of r.items){
    if(!obj(x)||!uuid(x.skillId)||skills.has(x.skillId)||!uuid(x.courseId)||
      !courses.has(x.courseId)||!str(x.title,160)||!optional(x.nextReviewAt,instant)||
      !number(x.priorityScore)||!(x.actionable===true||x.actionable===false||x.actionable===null)||
      !optional(x.sourceRoute,y=>str(y,320)&&studyAction("https://study.thiepn.dev",y)!==null))
      throw Error("Invalid academic review");
    skills.add(x.skillId);
  }
  return v as AcademicRead;
}
export async function fetchAcademic(origin:string,token:string,from:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
  if(!studyOrigin(origin)||!token||token.length>16384||!/^[\x21-\x7e]+$/.test(token)||!date(from))
    throw Error("No authorized academic read");
  const response=await fetcher(origin+"/api/hub/study/v1/summary?from="+encodeURIComponent(from)+"&days=7",{
    method:"GET",headers:{Accept:"application/json",Authorization:"Bearer "+token},
    credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",signal});
  if(!response.ok)throw Error("StudyOS source unavailable");
  if(Number(response.headers.get("content-length")||0)>150000)throw Error("StudyOS response exceeds limit");
  const bodyText=await response.text();
  if(new TextEncoder().encode(bodyText).length>150000)throw Error("StudyOS response exceeds limit");
  const body:unknown=JSON.parse(bodyText);
  if(!obj(body)||body.ok!==true)throw Error("StudyOS invalid response");
  if(body.status==="setup_required")return {kind:"setup_required" as const};
  if(body.status!=="ready")throw Error("StudyOS source status unavailable");
  const data=parseAcademic(body.data);
  if(data.coverage.from!==from||data.coverage.days!==7)throw Error("Wrong academic source horizon");
  return {kind:"ready" as const,data};
}
const action=(origin:string|null,path:string|null)=>origin&&path?studyAction(origin,path):null;
const when=(v:string,zone:string)=>new Intl.DateTimeFormat("de-DE",{timeZone:zone,day:"2-digit",month:"2-digit",
  year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
function rows(items:{title:string;detail:string;href:string|null}[],empty:string){
  if(!items.length)return "<p>"+esc(empty)+"</p>";
  return "<ul>"+items.map(i=>'<li><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.detail)+
    '</small></div>'+(i.href?'<a href="'+esc(i.href)+'" rel="noopener noreferrer">Open StudyOS</a>':"")+"</li>").join("")+"</ul>";
}
export function renderAcademic(state:AcademicState,origin:string|null,mode:"today"|"week",now=Date.now()):string{
  const header='<section class="ws-surface ws-study-c1" aria-label="StudyOS academic overview">'+
    '<header><div><small>StudyOS · original source records</small><h2>'+
    (mode==="week"?"Study in your week":"University today")+'</h2></div>';
  if(state.kind==="ready"&&Date.parse(state.data.expiresAt)<=now)state={kind:"stale"};
  if(state.kind!=="ready"){
    const message={
      disconnected:"Connect StudyOS to include academic deadlines and reviews in this Hub view.",
      unconfigured:"StudyOS source connection is not configured; no academic data was queried.",
      "signed-out":"Sign in to THIEPN Account first; no academic records were read.",
      loading:"Reading authorized StudyOS academic records…",
      setup_required:"No active semester is configured in StudyOS.",
      unavailable:"StudyOS is unavailable; that does not mean zero exams, assignments or reviews.",
      stale:"The previous academic summary expired; refresh to see current records."
    }[state.kind];
    return header+(state.kind==="loading"||state.kind==="unconfigured"?"":'<button data-action="study-connect" type="button">Connect / Refresh</button>')+
      "</header><p role=\"status\">"+esc(message)+"</p></section>";
  }
  const x=state.data,zone=x.semester.timezone;
  const selected=x.coverage.from,limit=addAcademicDays(selected,x.coverage.days);
  const upcoming=x.exams.filter(e=>localAcademicDay(e.examAt,zone)>=selected&&
    localAcademicDay(e.examAt,zone)<limit).sort((a,b)=>a.examAt.localeCompare(b.examAt));
  const overdue=x.commitments.filter(c=>localAcademicDay(c.dueAt,zone)<selected);
  const daySections=Array.from({length:7},(_,index)=>{
    const day=addAcademicDays(selected,index);
    const deadlines=x.commitments.filter(c=>localAcademicDay(c.dueAt,zone)===day);
    const exams=upcoming.filter(e=>localAcademicDay(e.examAt,zone)===day);
    const dayRows=[
      ...exams.map(e=>({title:e.courseName+" exam",detail:when(e.examAt,zone)+" · owner-configured, not university-verified",href:action(origin,e.sourceRoute)})),
      ...deadlines.map(c=>({title:c.title,detail:c.kind+" · "+when(c.dueAt,zone)+" · "+c.estimatedMinutes+" min estimate",href:action(origin,c.sourceRoute)}))
    ];
    return "<section class=\"ws-study-c1-day\"><h4>"+esc(day)+" · "+(exams.length+deadlines.length)+
      " academic dates</h4>"+rows(dayRows,"No source deadlines for this day.")+"</section>";
  });
  const dueReviews=x.reviews.items.map(r=>({title:r.title,detail:r.actionable===true?
    "Original eligible question · source-owned mastery":r.actionable===null?
    "Question availability unknown — source read is partial":"No eligible original question confirmed",
    href:r.actionable===true?action(origin,r.sourceRoute):null}));
  const courses=x.courses.map(c=>({title:c.name,detail:
    (c.durableMasteryPercent===null?"Mastery not established":c.durableMasteryPercent+"% durable mastery")+
    " · "+(c.totalSkills===null?"Skills unknown":c.totalSkills+" skills")+
    (c.unresolvedErrors===null?"":" · "+c.unresolvedErrors+" unresolved errors"),href:action(origin,c.sourceRoute)}));
  return header+'<button type="button" data-action="study-connect">Refresh</button>'+
    '<button type="button" data-action="study-disconnect">Disconnect</button></header>'+
    "<p>"+esc(x.semester.name)+" · "+esc(zone)+" · original source checked "+esc(when(x.generatedAt,zone))+
    " · expires "+esc(when(x.expiresAt,zone))+"</p>"+
    (x.coverage.status==="partial"?'<p class="ws-study-c1-warning" role="status">Partial academic coverage: '+
      esc(x.coverage.reasons.join(", "))+"</p>":"")+
    '<p class="ws-study-c1-disclosure">Academic dates are not free/busy reservations. Exams are owner-configured; source counts may be limited. Original IDs, academic mastery and changes stay in StudyOS.</p>'+
    (overdue.length?'<section class="ws-study-c1-overdue"><h3>Overdue assignments ('+overdue.length+')</h3>'+
      rows(overdue.map(c=>({title:c.title,detail:c.kind+" · due "+when(c.dueAt,zone),href:action(origin,c.sourceRoute)})),"")+"</section>":"")+
    '<div class="ws-study-c1-grid"><section><h3>'+ (mode==="week"?"Academic week":"Next seven days")+
    "</h3><div class=\"ws-study-c1-days\">"+daySections.join("")+"</div></section>"+
    '<section><h3>Due reviews ('+x.reviews.dueSkillCount+')</h3><p>'+
      x.reviews.actionableSkillCount+" confirmed actionable · "+x.reviews.budgetMinutes+" min review budget</p>"+
    rows(dueReviews.slice(0,12),x.reviews.dueSkillCount>0?
      "The bounded source has no visible eligible review details.":"No due review recorded in this source.")+
    (dueReviews.length>12?'<small>Showing 12 of '+dueReviews.length+" review topics.</small>":"")+
    '</section><section><h3>Course progress ('+x.courses.length+')</h3>'+
    rows(courses,"No active StudyOS courses.")+"</section></div></section>";
}
