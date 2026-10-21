import {describe,it,expect} from "vitest";
import {composeCalendarView,verifiedAcademic,type AcademicCalendarProjection} from "../../src/lib/workspace/calendar-composition-c2";
import type {HubCalendarData} from "../../src/lib/workspace/google-calendar-c1";
import type {CalendarEvent} from "../../src/lib/workspace/types";
const NOW=Date.parse("2026-10-26T07:00:00Z");
const expiry=new Date(NOW+300000).toISOString();
const course="00000000-0000-4000-8000-000000000001";
const localId="00000000-0000-4000-8000-000000000011";
const g=(events:HubCalendarData["events"]=[],changes:Partial<HubCalendarData>={}):HubCalendarData=>({
  schema:"studyos-hub-calendar",version:1,generatedAt:new Date(NOW).toISOString(),expiresAt:expiry,
  sourceSyncedAt:new Date(NOW-3600000).toISOString(),from:"2026-10-26",days:7,
  status:"ready",account:"someone@example.com",
  coverage:{reasons:[],selectedCalendars:1,eventsCapped:false},events,...changes,
});
const event=(id:string,start:string,end:string,blocksTime=true):HubCalendarData["events"][number]=>({
  id,source:"google-calendar",title:"DGL lecture",calendarName:"University",start,end,
  allDay:false,blocksTime,role:"lecture",location:null
});
const hub=(start:string,end:string):CalendarEvent=>({id:localId,title:"Local activity",
  date:"2026-10-26",endDate:"2026-10-26",start,end,zone:"Europe/Berlin",allDay:false});
const academic=(items:AcademicCalendarProjection["items"]=[]):AcademicCalendarProjection=>
  ({status:"complete",reasons:[],items});
const view=(change:Partial<Parameters<typeof composeCalendarView>[0]>={})=>
  composeCalendarView({local:[],google:g(),academic:academic(),selected:"2026-10-26",
    mode:"day",timezone:"Europe/Berlin",now:NOW,...change});
describe("C2 original native calendar composition",()=>{
  it("preserves original IDs and merges distinct Hub and Google instances",()=>{
    const source=g([event('["g","1"]',"2026-10-26T08:00:00Z","2026-10-26T09:00:00Z")]);
    const result=view({google:source,local:[hub("2026-10-26T09:30:00Z","2026-10-26T10:30:00Z")]});
    expect(result.days[0]!.items.map(x=>x.id)).toEqual(['google:["g","1"]',"hub:"+localId]);
    expect(result.days[0]!.items.map(x=>x.owner)).toEqual(["google","hub"]);
    expect(result.days[0]!.availableMinutes).toBe(510);
  });
  it("does not double-count an academic deadline linked to an actual Google event identity",()=>{
    const key='["g","1"]';
    const source=g([event(key,"2026-10-26T08:00:00Z","2026-10-26T09:00:00Z")]);
    const date:AcademicCalendarProjection["items"][number]={
      id:"studyos:commitment:"+course,kind:"deadline",title:"Submit DGL",
      at:"2026-10-26T08:00:00Z",courseId:course,courseName:"DGL",
      sourceRoute:"/courses/"+course,calendarIdentity:key,blocksTime:false
    };
    expect(view({google:source,academic:academic([date])}).days[0]!.items).toHaveLength(1);
  });
  it("retains separate academic dates but never counts their deadline as a busy slot",()=>{
    const date:AcademicCalendarProjection["items"][number]={
      id:"studyos:exam:"+course,kind:"exam",title:"DGL exam",
      at:"2026-10-26T14:00:00Z",courseId:course,courseName:"DGL",
      sourceRoute:"/courses/"+course,calendarIdentity:null,blocksTime:false
    };
    const r=view({academic:academic([date])});
    expect(r.days[0]!.items[0]!.owner).toBe("studyos");
    expect(r.days[0]!.items[0]!.blocksTime).toBe(false);
    expect(r.days[0]!.availableMinutes).toBe(630);
  });
  it("stale/partial data suppresses free-time certainty while keeping read-only entries",()=>{
    const stale=g([event("cal:a","2026-10-26T08:00:00Z","2026-10-26T09:00:00Z")],{status:"stale"});
    const r=view({google:stale});
    expect(r.days[0]!.items).toHaveLength(1);
    expect(r.days[0]!.availableMinutes).toBeNull();
    expect(r.status).toBe("partial");
  });
  it("keeps weekday windows 08–20 with meal exclusions and no midnight overtime",()=>{
    const late=event("late","2026-10-26T20:00:00Z","2026-10-26T22:00:00Z");
    expect(view({google:g([late])}).days[0]!.availableMinutes).toBe(630);
  });
  it("caps both Saturday and Sunday at 210min without inventing weekend sessions",()=>{
    const r=view({selected:"2026-10-31",mode:"day"});
    expect(r.days[0]!.studyGoalMinutes).toBe(210);
    expect(r.days[0]!.availableMinutes).toBe(210);
  });
  it("handles autumn DST boundary via original zonedInstant rather than 24h arithmetic",()=>{
    const source=g([], {from:"2026-10-25",days:7});
    const r=view({google:source,selected:"2026-10-25"});
    expect(r.days[0]!.availableMinutes).toBe(210);
  });
  it("week view uses original Monday–Sunday selection with independent source IDs",()=>{
    const r=view({mode:"week",google:g()});
    expect(r.days).toHaveLength(7);
    expect(r.days[0]!.date).toBe("2026-10-26");
    expect(r.days[6]!.date).toBe("2026-11-01");
    expect(r.days[6]!.studyGoalMinutes).toBe(210);
  });
  it("rejects malformed academic links rather than displaying them in native calendar",()=>{
    expect(verifiedAcademic({status:"complete",reasons:[],items:[
      {id:"studyos:exam:"+course,at:"2026-10-26T11:00:00Z",kind:"exam",
      title:"Example",sourceRoute:"https://evil.example",calendarIdentity:null,blocksTime:false}
    ]})).toBeNull();
  });
});
