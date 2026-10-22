/** User-authorized, session-only projection of the ORIGINAL StudyOS 23-week roadmap.
 * No defaults, server upload, draft writer, scheduler or fabricated completions.
 */
export type ImportedWeek={
 week:number;start:string;end:string;independent_budget_hours:number;
 hours_by_course:Record<string,number>;focus:string;actions:string;checkpoint:string;fallback:string;
};
export type ImportedStudyRoadmap={
 schema:"studyos-exam-roadmap-v2";generated_on:string;timezone:"Europe/Berlin";
 hours_definition:string;normal_week_hours:number;
 weekday_window:{start:"08:00";end:"20:00";lunch_minutes:number;dinner_minutes:number};
 weekend_independent_range_hours_per_day:[number,number];
 weeks:ImportedWeek[];
};
const keys=["DGL","Stoch","TI","AMP","Prog","Mikro"];
const day=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+"T12:00:00Z"))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const text=(v:unknown,max:number):v is string=>typeof v==="string"&&v.length<=max;
const num=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const next=(date:string)=>{
 const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
};
export function parseStudyRoadmap(input:unknown):ImportedStudyRoadmap{
 if(!obj(input)||input.schema!=="studyos-exam-roadmap-v2"||
   !day(input.generated_on)||input.timezone!=="Europe/Berlin"||
   !text(input.hours_definition,300)||!num(input.normal_week_hours,1,70)||
   !obj(input.weekday_window)||input.weekday_window.start!=="08:00"||
   input.weekday_window.end!=="20:00"||
   !num(input.weekday_window.lunch_minutes,30,120)||
   !num(input.weekday_window.dinner_minutes,30,120)||
   !Array.isArray(input.weekend_independent_range_hours_per_day)||
   input.weekend_independent_range_hours_per_day.length!==2||
   input.weekend_independent_range_hours_per_day[0]!==3||
   input.weekend_independent_range_hours_per_day[1]!==4||
   !Array.isArray(input.weeks)||input.weeks.length!==23)
   throw Error("Invalid StudyOS roadmap header");
 let previousEnd:string|null=null;
 for(let i=0;i<input.weeks.length;i++){
   const w:unknown=input.weeks[i];
   if(!obj(w)||w.week!==i+1||!day(w.start)||!day(w.end)||w.end<w.start||
     previousEnd!==null&&w.start!==next(previousEnd)||
     !num(w.independent_budget_hours,0,70)||!obj(w.hours_by_course)||
     Object.keys(w.hours_by_course).sort().join("|")!==[...keys].sort().join("|")||
     !text(w.focus,200)||!text(w.actions,2000)||!text(w.checkpoint,1000)||
     !text(w.fallback,1000))
     throw Error("Invalid weekly StudyOS roadmap record");
   let sum=0;
   for(const key of keys) {
     const value=w.hours_by_course[key];
     if(!num(value,0,70))throw Error("Invalid course budget");
     sum+=value;
   }
   if(Math.abs(sum-w.independent_budget_hours)>0.001)
     throw Error("Roadmap course hours do not match weekly target");
   previousEnd=w.end;
 }
 if(input.weeks[0].start!=="2026-10-21"||
   input.weeks[22].end!=="2027-03-23")throw Error("Unexpected roadmap period");
 return input as ImportedStudyRoadmap;
}
export function roadmapWeekForDate(plan:ImportedStudyRoadmap,date:string):ImportedWeek|null {
 return plan.weeks.find(w=>w.start<=date&&w.end>=date)??null;
}
export function weekCourseTargets(week:ImportedWeek){
 return keys.filter(key=>(week.hours_by_course[key]??0)>0)
  .map(key=>({course:key,minutes:Math.round(week.hours_by_course[key]!*60)}));
}
