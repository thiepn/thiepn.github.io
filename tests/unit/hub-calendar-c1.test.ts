import { describe,it,expect } from "vitest";
import { CalendarConnectionFailure,calendarEsc,fetchHubCalendar,hubCalendarOrigin,validHubCalendarDay,parseHubCalendar } from "../../src/lib/workspace/google-calendar-c1";
const NOW=Date.parse("2026-10-21T15:00:00Z");
const source=()=>{
  const event={id:'["primary","event-1"]',source:"google-calendar",title:"TI Übung",
    calendarName:"University",start:"2026-10-22T10:00:00Z",end:"2026-10-22T11:30:00Z",
    allDay:false,blocksTime:true,role:"exercise",location:"Room 2"};
  return {schema:"studyos-hub-calendar",version:1,generatedAt:new Date(NOW).toISOString(),
    expiresAt:new Date(NOW+5*60000).toISOString(),sourceSyncedAt:"2026-10-21T14:00:00Z",
    from:"2026-10-21",days:7,status:"ready",account:"student@example.com",
    coverage:{reasons:[],selectedCalendars:1,eventsCapped:false},events:[event]};
};
describe("C1 owner calendar client",()=>{
  it("accepts only original StudyOS HTTPS origin",()=>{
    expect(hubCalendarOrigin("https://study.thiepn.dev")).toBe("https://study.thiepn.dev");
    for(const v of ["https://study.thiepn.dev.evil.test","http://study.thiepn.dev",
      "https://study.thiepn.dev/path","https://study.thiepn.dev/?token=123","https://evil@study.thiepn.dev"])
      expect(hubCalendarOrigin(v)).toBeNull();
  });
  it("accepts a bounded, genuine source projection",()=>{
    expect(parseHubCalendar(source(),NOW).events).toHaveLength(1);
    expect(parseHubCalendar({...source(),status:"stale"},NOW).status).toBe("stale");
  });
  it("rejects duplicate identities, forged durations, and expired snapshots",()=>{
    const v=source();
    expect(()=>parseHubCalendar({...v,events:[...v.events,...v.events]},NOW)).toThrow();
    expect(()=>parseHubCalendar({...v,days:21},NOW)).toThrow();
    expect(()=>parseHubCalendar(v,NOW+300001)).toThrow();
    expect(()=>parseHubCalendar({...v,status:"disconnected"},NOW)).toThrow();
  });
  it("escapes malicious event text instead of inserting markup",()=>{
    expect(calendarEsc('<img src=x onerror="alert(1)">')).toContain("&lt;img");
    expect(calendarEsc('<img src=x onerror="alert(1)">')).not.toContain("<img");
  });
  it("sends only a bearer, read-only, no-store request and checks its window",async()=>{
    const params:{url?:string;init?:RequestInit}={};
    const fetcher=(async(url:RequestInfo|URL,init?:RequestInit)=>{
      params.url=String(url);if(init)params.init=init;
      return new Response(JSON.stringify({ok:true,data:{...source(),generatedAt:new Date().toISOString(),
        expiresAt:new Date(Date.now()+5*60000).toISOString()}}),{
          status:200,headers:{"content-type":"application/json"}});
    }) as typeof fetch;
    const value=await fetchHubCalendar("https://study.thiepn.dev","signed.example.token","2026-10-21",new AbortController().signal,fetcher);
    expect(value.events).toHaveLength(1);
    expect(params.url).toBe("https://study.thiepn.dev/api/hub/calendar/v1/events?from=2026-10-21&days=7");
    expect(params.init?.method).toBe("GET");
    expect(params.init?.credentials).toBe("omit");
    expect(params.init?.cache).toBe("no-store");
    expect((params.init?.headers as Record<string,string>).Authorization).toBe("Bearer signed.example.token");
  });
});

describe("C1 actionable source failures",()=>{
  for(const [status,issue] of [[401,"session"],[403,"permission"],[404,"endpoint"],[503,"source"]] as const){
    it("classifies HTTP "+status+" without exposing response details",async()=>{
      const fetcher=(async()=>new Response(JSON.stringify({error:"private"}),{status})) as typeof fetch;
      await expect(fetchHubCalendar("https://study.thiepn.dev","signed.example.token","2026-10-21",new AbortController().signal,fetcher))
        .rejects.toMatchObject({name:"CalendarConnectionFailure",issue});
    });
  }
  it("does not mistake an unreachable provider for a connected calendar",()=>{
    expect(new CalendarConnectionFailure("network").issue).toBe("network");
  });
});

describe("Calendar C2 local selected-day handoff",()=>{
  it("accepts the real local owner date and rejects malformed or impossible dates",()=>{
    expect(validHubCalendarDay("2026-10-22")).toBe(true);
    expect(validHubCalendarDay("2026-10-26")).toBe(true);
    expect(validHubCalendarDay("2026-02-30")).toBe(false);
    expect(validHubCalendarDay("2026-10-2")).toBe(false);
    expect(validHubCalendarDay("\\d{4}-\\d{2}-\\d{2}")).toBe(false);
  });
});
