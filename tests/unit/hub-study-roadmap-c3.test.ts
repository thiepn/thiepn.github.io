import {describe,it,expect} from "vitest";
import {parseStudyRoadmap,roadmapWeekForDate,weekCourseTargets} from "../../src/lib/workspace/study-roadmap-c3";
import {verifyNativeStudyPlan} from "../../src/lib/workspace/study-week-c3";
const courses=["DGL","Stoch","TI","AMP","Prog","Mikro"];
function increment(day:string,n:number){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function roadmap(){
 let cursor="2026-10-21";
 const weeks=Array.from({length:23},(_,i)=>{
   const end=i===0?"2026-10-25":i===22?"2027-03-23":increment(cursor,6);
   const item={week:i+1,start:cursor,end,independent_budget_hours:42,
     hours_by_course:Object.fromEntries(courses.map(k=>[k,7])),
     focus:"Practice",actions:"Do assigned problems",checkpoint:"Check original score",
     fallback:"Rebalance if not admitted"};
   cursor=increment(end,1);return item;
 });
 return {schema:"studyos-exam-roadmap-v2",generated_on:"2026-10-21",
 timezone:"Europe/Berlin",hours_definition:"Independent study, no after-20:00 count",normal_week_hours:42,
 weekday_window:{start:"08:00",end:"20:00",lunch_minutes:45,dinner_minutes:45},
 weekend_independent_range_hours_per_day:[3,4],weeks};
}
const id="00000000-0000-4000-8000-000000000001";
describe("C3 original StudyOS 23-week roadmap contract",()=>{
 it("accepts exactly 23 consecutive weeks and original six course allocations",()=>{
   const data=parseStudyRoadmap(roadmap());
   expect(data.weeks).toHaveLength(23);
   expect(roadmapWeekForDate(data,"2026-11-01")?.week).toBe(2);
   expect(roadmapWeekForDate(data,"2027-03-23")?.week).toBe(23);
   expect(weekCourseTargets(data.weeks[1]!)).toHaveLength(6);
   expect(weekCourseTargets(data.weeks[1]!).reduce((sum,r)=>sum+r.minutes,0)).toBe(2520);
 });
 it("rejects invented zero-step, non-consecutive and inflated hours",()=>{
   const gap=roadmap();gap.weeks[1]!.start="2026-10-27";
   expect(()=>parseStudyRoadmap(gap)).toThrow();
   const bogus=roadmap();bogus.weeks[4]!.hours_by_course.DGL=20;
   expect(()=>parseStudyRoadmap(bogus)).toThrow();
   expect(()=>parseStudyRoadmap({...roadmap(),weeks:[]})).toThrow();
 });
 it("enforces exact weekend, study window and excludes midnight study",()=>{
   expect(()=>parseStudyRoadmap({...roadmap(),weekday_window:{start:"08:00",end:"24:00",lunch_minutes:45,dinner_minutes:45}})).toThrow();
   expect(()=>parseStudyRoadmap({...roadmap(),weekend_independent_range_hours_per_day:[8,12]})).toThrow();
 });
 it("rejects forged links, duplicated weeks, or mutated active week identity",()=>{
   const base={source:"studyos-week-plans",readonly:true,status:"active",
     weeks:[{id,start:"2026-10-26",end:"2026-11-01",revision:1,objective:"Quiz",courseBudgetMinutes:600,
       committedAt:"2026-10-25T12:00:00Z",courses:[{courseId:id,stableKey:"differentialgleichungen",label:"DGL",
         targetMinutes:600,actionTitle:"Practice",sourceRoute:"/courses/"+id}]}],capacities:[]};
   expect(verifyNativeStudyPlan(base)?.weeks).toHaveLength(1);
   expect(verifyNativeStudyPlan({...base,weeks:[base.weeks[0],base.weeks[0]]})).toBeNull();
   expect(verifyNativeStudyPlan({...base,weeks:[{...base.weeks[0],courses:[{...base.weeks[0].courses[0],sourceRoute:"https://evil.invalid"}]}]})).toBeNull();
 });
});
