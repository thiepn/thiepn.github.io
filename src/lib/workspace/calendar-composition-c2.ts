/** Read-only composition of original Hub events, owner-scoped Google instances and
 * source-owned StudyOS dates. No additional writer, persistent store or scheduling engine.
 */
import { addDays, dayKey, weekDays, zonedInstant } from "./model";
import type { CalendarEvent } from "./types";
import type { HubCalendarData } from "./google-calendar-c1";

export interface AcademicCalendarAnchor {
  id:string;kind:string;title:string;at:string;courseId?:string|null;
  courseName?:string|null;sourceRoute:string;calendarIdentity:string|null;blocksTime:false;
}
export interface AcademicCalendarProjection {
  status:"complete"|"partial"|"setup_required";reasons:string[];items:AcademicCalendarAnchor[];
}
export interface CalendarEntry {
  id:string;owner:"hub"|"google"|"studyos";title:string;start:string;end:string|null;
  allDay:boolean;blocksTime:boolean;label:string;sourceRoute:string|null;kind:string;
}
export type ComposedDay = {date:string;items:CalendarEntry[];
  availableMinutes:number|null;studyGoalMinutes:number;sourceReliable:boolean;
  assumptions:"proposed_meals_and_free_time";};
export type ComposedCalendar = {days:ComposedDay[];status:"connected"|"stale"|"partial"|"disconnected";
  reasons:string[];localCount:number;googleCount:number;academicCount:number};
const isUUID=(s:unknown):s is string=>typeof s==="string"&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s);
const instant=(s:unknown):s is string=>typeof s==="string"&&Number.isFinite(Date.parse(s));
function validAcademic(input:unknown):AcademicCalendarProjection|null {
  if(!input||typeof input!=="object")return null;
  const p=input as AcademicCalendarProjection;
  if(!["complete","partial","setup_required"].includes(p.status)||!Array.isArray(p.items)||
     p.items.length>130||!Array.isArray(p.reasons)||p.reasons.length>8||
     p.reasons.some(r=>typeof r!=="string"||r.length>80))return null;
  const seen=new Set<string>();
  for(const item of p.items){
    if(!item||typeof item!=="object"||typeof item.id!=="string"||item.id.length>100||
       !/^(studyos:exam:|studyos:commitment:)[\da-f-]{36}$/.test(item.id)||
       seen.has(item.id)||typeof item.title!=="string"||item.title.length>200||
       !instant(item.at)||!["exam","deadline","assignment","administrative","quiz","other"].includes(item.kind)||
       item.blocksTime!==false||typeof item.sourceRoute!=="string"||
       !(item.sourceRoute==="/courses"||/^\/courses\/[\da-f-]{36}$/.test(item.sourceRoute))||
       !(item.calendarIdentity===null||typeof item.calendarIdentity==="string"&&item.calendarIdentity.length<=600)||
       !(item.courseId===undefined||item.courseId===null||isUUID(item.courseId))||
       !(item.courseName===undefined||item.courseName===null||typeof item.courseName==="string"&&item.courseName.length<=160))
      return null;
    seen.add(item.id);
  }
  return p;
}
export function verifiedAcademic(value:unknown):AcademicCalendarProjection|null {return validAcademic(value)}
const ranges=(items:CalendarEntry[],lo:number,hi:number)=>items.filter(e=>e.blocksTime&&
  (e.allDay || e.end!==null)&&Date.parse(e.start)<hi&&e.end!==null&&Date.parse(e.end)>lo)
    .map(e=>[Math.max(lo,Date.parse(e.start)),Math.min(hi,Date.parse(e.end!))] as const);
const subtract=(from:number,to:number,rangesIn:readonly (readonly [number,number])[])=>{
  const intervals=rangesIn.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let cursor=from,remaining=0;
  for(const [a,b] of intervals){
    if(a>cursor)remaining+=Math.max(0,Math.min(a,to)-cursor);
    cursor=Math.max(cursor,b);if(cursor>=to)break;
  }
  return Math.round((remaining+Math.max(0,to-cursor))/60000);
};
export function composeCalendarView(args:{
  local: readonly CalendarEvent[];
  google: HubCalendarData|null;
  academic: AcademicCalendarProjection|null;
  selected:string;mode:"day"|"week";timezone:string;
  now?:number;
}):ComposedCalendar {
  const dates=args.mode==="week"?weekDays(args.selected):[args.selected];
  const google=args.google&&Date.parse(args.google.expiresAt)>(args.now??Date.now())?args.google:null;
  const allowedDays=google&&google.from<=dates[0]!&&
    addDays(google.from,google.days)>=addDays(dates[dates.length-1]!,1);
  const validSource=allowedDays?google:null;
  const events:CalendarEntry[]=[];
  const seen=new Set<string>();
  const include=(e:CalendarEntry)=>{
    if(seen.has(e.id))return;seen.add(e.id);events.push(e);
  };
  for(const l of args.local){
    if(!isUUID(l.id))continue;
    const start=l.allDay?zonedInstant(l.date,"00:00",args.timezone):l.start;
    const end=l.allDay?zonedInstant(addDays(l.endDate,1),"00:00",args.timezone):l.end;
    if(!instant(start)||!instant(end)||Date.parse(end)<=Date.parse(start))continue;
    include({id:"hub:"+l.id,owner:"hub",title:l.title.slice(0,240),start,end,
      allDay:l.allDay,blocksTime:true,label:"Hub",kind:"event",sourceRoute:null});
  }
  for(const e of validSource?.events??[]){
    include({id:"google:"+e.id,owner:"google",title:e.title,start:e.start,end:e.end,
      allDay:e.allDay,blocksTime:e.blocksTime,label:e.calendarName,kind:e.role,sourceRoute:null});
  }
  const linked=new Set((validSource?.events??[]).map(e=>e.id));
  for(const a of args.academic?.items??[]){
    if(a.calendarIdentity&&linked.has(a.calendarIdentity))continue; // Same original provider event.
    include({id:a.id,owner:"studyos",title:a.title,start:a.at,end:null,allDay:false,
      blocksTime:false,label:a.courseName??"StudyOS",kind:a.kind,sourceRoute:a.sourceRoute});
  }
  const reliable=validSource?.status==="ready"&&args.academic?.status==="complete";
  const days=dates.map(date=>{
    // Original Hub time-zone math provides DST-safe wall-clock bounds.
    const lo=Date.parse(zonedInstant(date,"08:00",args.timezone));
    const hi=Date.parse(zonedInstant(date,"20:00",args.timezone));
    const tomorrow=Date.parse(zonedInstant(addDays(date,1),"00:00",args.timezone));
    const midnight=Date.parse(zonedInstant(date,"00:00",args.timezone));
    const present=events.filter(e=>e.end===null?
      dayKey(args.timezone,new Date(e.start))===date:
      Date.parse(e.start)<tomorrow&&Date.parse(e.end)>midnight)
      .sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
    const weekday=new Date(date+"T12:00:00Z").getUTCDay();
    const weekend=weekday===0||weekday===6;
    // Proposed meals, not claims about the user's actual lunch/dinner calendar.
    const meals=[["12:30","13:15"],["18:00","18:45"]].map(([a,b])=>
      [Date.parse(zonedInstant(date,a!,args.timezone)),Date.parse(zonedInstant(date,b!,args.timezone))] as const);
    const busy=ranges(present,lo,hi);
    const minutes=subtract(lo,hi,[...meals,...busy]);
    return {date,items:present,availableMinutes:reliable?(weekend?Math.min(minutes,210):minutes):null,
      studyGoalMinutes:weekend?210:420,sourceReliable:reliable,
      assumptions:"proposed_meals_and_free_time" as const};
  });
  const reasons=[...new Set([...(validSource?.coverage.reasons??[]),...(args.academic?.reasons??[]),
    ...(!validSource?["google_not_loaded_or_out_of_range"]:[]),
    ...(validSource?.status!=="ready"?["google_not_fresh"]:[]),
    ...(args.academic?.status!=="complete"?["academic_incomplete"]:[])])];
  const status= !validSource?"disconnected":reasons.length?"partial":"connected";
  return {days,status,reasons,
    localCount:events.filter(e=>e.owner==="hub").length,
    googleCount:events.filter(e=>e.owner==="google").length,
    academicCount:events.filter(e=>e.owner==="studyos").length};
}
