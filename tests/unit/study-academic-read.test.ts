import {describe,it,expect} from "vitest";
import {parseAcademic,studyOrigin,studyAction,renderAcademic,academicWeekStart,fetchAcademic} from "../../src/lib/workspace/study-academic-read";
const id="11111111-1111-4111-8111-111111111111",skill="22222222-2222-4222-8222-222222222222";
const origin="https://study.thiepn.dev",gen="2026-10-17T12:00:00Z";
const sample=()=>({
 schema:"study-hub-summary",schemaVersion:1,generatedAt:gen,expiresAt:"2026-10-17T12:05:00Z",
 semester:{id,name:"Wintersemester",timezone:"Europe/Berlin"},
 coverage:{status:"partial",reasons:["reviews_cap"],truncated:true,from:"2026-10-17",days:7,
 calendarCoverage:"not_included",academicCandidates:"not_published"},
 courses:[{source:"studyos",courseId:id,name:"DGL",shortName:"DGL",sortOrder:0,examAt:"2026-10-19T10:00:00Z",
 examVerification:"owner_configured",durableMasteryPercent:40,totalSkills:20,unresolvedErrors:3,sourceRoute:"/courses/"+id}],
 exams:[{source:"studyos",courseId:id,courseName:"DGL",examAt:"2026-10-19T10:00:00Z",
 verification:"owner_configured",sourceRoute:"/courses/"+id}],
 commitments:[{source:"studyos",commitmentId:id,courseId:id,resourceId:null,title:"<img src=x>",kind:"assignment",
 dueAt:"2026-10-20T11:00:00Z",estimatedMinutes:90,priority:2,status:"open",originalUpdatedAt:gen,
 calendarIdentity:null,sourceRoute:"/courses/"+id}],
 reviews:{dueSkillCount:1,actionableSkillCount:1,budgetMinutes:40,items:[{source:"studyos",skillId:skill,courseId:id,
 title:"Variation",nextReviewAt:null,priorityScore:8,actionable:true,
 sourceRoute:"/practice?mode=repair&course="+id+"&skill="+skill}]},
 candidates:[]
});
const now=Date.parse("2026-10-17T12:01:00Z");
describe("C1-B StudyOS original read-only projection",()=>{
 it("accepts the ACTUAL C1-A sourceRoute and exact-skill practice contract",()=>{
  const x=parseAcademic(sample(),now);
  expect(x.reviews.items[0]?.sourceRoute).toContain("mode=repair");
  expect(studyAction(origin,x.reviews.items[0]?.sourceRoute)).toContain("/practice?mode=repair");
 });
 it("renders original exams, academic dates and course progress in seven-day Hub view",()=>{
  const x=parseAcademic(sample(),now);
  const html=renderAcademic({kind:"ready",data:x},origin,"week",now);
  expect(html).toContain("Study in your week");
  expect(html).toContain("Due reviews");
  expect(html).toContain("Course progress");
 });
 it("prevents XSS and never invents local task/calendar controls",()=>{
  const x=parseAcademic(sample(),now);
  const html=renderAcademic({kind:"ready",data:x},origin,"today",now);
  expect(html).toContain("&lt;img src=x&gt;");expect(html).not.toContain("<img");
  expect(html).toContain("40% durable mastery");expect(html).toContain("owner-configured");
  expect(html).not.toContain("data-task-toggle");
 });
 it("rejects unrelated origin, cross-origin links, unsafe deep links and duplicate parameters",()=>{
  expect(studyOrigin("https://studyos.thiepn.dev")).toBeNull();
  expect(studyOrigin("https://evil.example")).toBeNull();
  expect(studyAction(origin,"//evil.example/path")).toBeNull();
  expect(studyAction(origin,"/practice?mode=repair&course="+id+"&skill="+skill+"&skill="+skill)).toBeNull();
  expect(studyAction(origin,"/practice?course="+id)).toBeNull();
  expect(studyAction(origin,"/courses/"+id)).toBe(origin+"/courses/"+id);
 });
 it("rejects expired owner snapshots and invalid semester timezone",()=>{
  expect(()=>parseAcademic(sample(),Date.parse("2026-10-17T12:06:00Z"))).toThrow();
  const x=sample();x.semester.timezone="No/Such_Zone";
  expect(()=>parseAcademic(x,now)).toThrow();
 });
 it("rejects foreign academic record IDs and source-owned calendar writers",()=>{
  const x=sample();x.reviews.items[0]!.courseId=skill;
  expect(()=>parseAcademic(x,now)).toThrow();
  const y=sample();y.candidates.push({kind:"auto_schedule"});
  expect(()=>parseAcademic(y,now)).toThrow();
 });
 it("validates actionable unknown separately from zero work",()=>{
  const x=sample();x.reviews.items[0]!.actionable=null as never;x.reviews.actionableSkillCount=0;
  const data=parseAcademic(x,now),html=renderAcademic({kind:"ready",data},origin,"today",now);
  expect(html).toContain("availability unknown");expect(html).not.toContain("0 confirmed actionable · 0 min");
 });
 it("gives no false zero-work claim for disconnected, expired, unavailable and setup",()=>{
  expect(renderAcademic({kind:"unavailable"},origin,"today",now)).toContain("does not mean zero");
  const d=parseAcademic(sample(),now);
  expect(renderAcademic({kind:"ready",data:d},origin,"today",Date.parse("2026-10-18T00:00:00Z"))).toContain("expired");
  expect(renderAcademic({kind:"setup_required"},origin,"today",now)).toContain("No active semester");
 });
 it("aligns academic week to Monday across Sundays and month transitions",()=>{
  expect(academicWeekStart("2026-10-18")).toBe("2026-10-12");
  expect(academicWeekStart("2026-11-01")).toBe("2026-10-26");
 });
 it("makes only a token-scoped no-credentials GET with caller-bound seven-day horizon",async()=>{
  let captured:RequestInit|undefined;let url="";
  const raw=sample();raw.coverage.status="complete";raw.coverage.reasons=[];raw.coverage.truncated=false;
  const fake=async (u:RequestInfo|URL,init?:RequestInit)=>{
    url=String(u);captured=init;return new Response(JSON.stringify({ok:true,status:"ready",data:raw}),
      {status:200,headers:{"content-type":"application/json"}});
  };
  const result=await fetchAcademic(origin,"header.payload.signature","2026-10-17",new AbortController().signal,fake as typeof fetch);
  // Old bounded fixture timestamp is only meaningful when tests use a fixed clock in pure parsing.
  expect(url).toContain("from=2026-10-17&days=7");
  expect(captured?.credentials).toBe("omit");expect(captured?.cache).toBe("no-store");
  expect(captured?.method).toBe("GET");
  expect(result.kind).toBe("ready");
 });
});
