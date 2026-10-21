/** Validate only original StudyOS weekly envelope projection; no inferred grades. */
export type StudyOSWeekCourse={courseId:string;label:string;stableKey:string;targetMinutes:number;actionTitle:string;sourceRoute:string};
export type StudyOSNativeWeek={id:string;start:string;end:string;revision:number;objective:string;courseBudgetMinutes:number|null;committedAt:string|null;courses:StudyOSWeekCourse[]};
export type StudyOSNativePlan={status:"active"|"no_active_week"|"partial";source:"studyos-week-plans";weeks:StudyOSNativeWeek[];capacities:{date:string;mode:string;customMinutes:number|null;budgetMinutes?:number|null}[];readonly:true};
const o=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==="string"&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
const day=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+"T12:00:00Z"));
const text=(v:unknown,n:number)=>typeof v==="string"&&v.length<=n;
const min=(v:unknown)=>v===null||Number.isInteger(v)&&Number(v)>=0&&Number(v)<=10080;
export function verifyNativeStudyPlan(input:unknown):StudyOSNativePlan|null{
 if(!o(input)||input.source!=="studyos-week-plans"||input.readonly!==true||
   !["active","no_active_week","partial"].includes(String(input.status))||
   !Array.isArray(input.weeks)||input.weeks.length>2||
   !Array.isArray(input.capacities)||input.capacities.length>14)return null;
 const seen=new Set<string>();
 for(const week of input.weeks){
   if(!o(week)||!id(week.id)||seen.has(week.id)||!day(week.start)||!day(week.end)||
     week.end<week.start||!Number.isInteger(week.revision)||Number(week.revision)<0||
     !text(week.objective,240)||!min(week.courseBudgetMinutes)||
     !(week.committedAt===null||text(week.committedAt,40))||
     !Array.isArray(week.courses)||week.courses.length>20)return null;
   seen.add(week.id);
   for(const c of week.courses){
     if(!o(c)||!id(c.courseId)||!text(c.label,120)||!text(c.stableKey,90)||
       !min(c.targetMinutes)||c.targetMinutes===null||!text(c.actionTitle,160)||
       c.sourceRoute!=="/courses/"+c.courseId)return null;
   }
 }
 for(const c of input.capacities){
   if(!o(c)||!day(c.date)||!["normal","light","recovery","intensive","custom"].includes(String(c.mode))||
     !min(c.customMinutes)||!(c.budgetMinutes===undefined||min(c.budgetMinutes)))return null;
 }
 return input as StudyOSNativePlan;
}
