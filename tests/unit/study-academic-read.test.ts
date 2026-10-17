import {describe,it,expect} from "vitest";
import {parseAcademic,studyOrigin,studyAction,renderAcademic} from "../../src/lib/workspace/study-academic-read";
const id="11111111-1111-4111-8111-111111111111", origin="https://studyos.thiepn.dev";
const sample=()=>({
 schema:"study-hub-summary",schemaVersion:1,generatedAt:"2026-10-17T12:00:00Z",expiresAt:"2026-10-17T12:05:00Z",
 semester:{id,name:"Wintersemester",timezone:"Europe/Berlin"},
 coverage:{status:"partial",reasons:["reviews_cap"],from:"2026-10-17",days:7},
 courses:[{courseId:id,name:"DGL",durableMasteryPercent:40,sourceHref:"/courses/"+id}],
 exams:[{courseId:id,courseName:"DGL",examAt:"2026-11-15T10:00:00Z",verification:"owner_configured",sourceHref:"/courses/"+id}],
 commitments:[{commitmentId:id,title:"<img src=x>",kind:"assignment",dueAt:"2026-10-20T11:00:00Z",estimatedMinutes:90,sourceHref:"/courses/"+id}],
 reviews:{dueSkillCount:1,actionableSkillCount:1,budgetMinutes:40,items:[{skillId:id,courseId:id,title:"Variation",actionable:true,sourceHref:"/practice?course="+id}]}
});
describe("StudyOS Hub C1 read model",()=>{
 it("escapes original academic content and discloses partial coverage",()=>{
  const data=parseAcademic(sample(),Date.parse("2026-10-17T12:01:00Z"));
  const html=renderAcademic({kind:"ready",data},origin,"week");
  expect(html).toContain("&lt;img");expect(html).not.toContain("<img");expect(html).toContain("reviews_cap");
 });
 it("fails closed on expired or malformed source",()=>{
  expect(()=>parseAcademic(sample(),Date.parse("2026-10-18T00:00:00Z"))).toThrow();
  const s=sample();s.reviews.items[0]!.skillId="invalid";
  expect(()=>parseAcademic(s,Date.parse("2026-10-17T12:00:00Z"))).toThrow();
 });
 it("restricts original routes and provider origin",()=>{
  expect(studyOrigin("https://evil.example")).toBeNull();
  expect(studyAction(origin,"//evil.example/path")).toBeNull();
  expect(studyAction(origin,"/practice?course="+id)).toBe(origin+"/practice?course="+id);
 });
 it("unknown source status never becomes a zero-work assertion",()=>{
  expect(renderAcademic({kind:"unavailable"},origin,"today")).toContain("not confirmation");
 });
});
