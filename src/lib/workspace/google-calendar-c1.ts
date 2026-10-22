/** Read-only StudyOS Google Calendar consumer. No second calendar store or OAuth tokens. */
export type CalendarConnectionIssue = "session"|"permission"|"endpoint"|"source"|"request"|"invalid-response"|"network"|"timeout";
export class CalendarConnectionFailure extends Error {
  constructor(public readonly issue:CalendarConnectionIssue){
    super("StudyOS calendar request failed: "+issue);
    this.name="CalendarConnectionFailure";
  }
}
export type HubCalendarEvent = {
  id:string;source:"google-calendar";title:string;calendarName:string;
  start:string;end:string;allDay:boolean;blocksTime:boolean;role:string;location:string|null;
};
export type HubCalendarData = {
  schema:"studyos-hub-calendar";version:1;generatedAt:string;expiresAt:string;
  sourceSyncedAt:string|null;from:string;days:number;
  status:"ready"|"stale"|"partial"|"disconnected";account:string|null;
  coverage:{reasons:string[];selectedCalendars:number;eventsCapped:boolean};
  events:HubCalendarEvent[];academic?:unknown;studyPlan?:unknown;
};
const obj=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const date=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  !Number.isNaN(Date.parse(value+"T12:00:00Z"))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;
const timestamp=(v:unknown):v is string=>typeof v==="string"&&Number.isFinite(Date.parse(v));
const str=(v:unknown,max:number):v is string=>typeof v==="string"&&v.length<=max;
export const validHubCalendarDay=(value:unknown):value is string=>date(value);
export function hubCalendarOrigin(value:unknown):string|null {
  if(typeof value!=="string"||!value)return null;
  try{
    const u=new URL(value);
    return u.origin==="https://study.thiepn.dev"&&u.pathname==="/"&&!u.search&&!u.hash&&
      !u.username&&!u.password?u.origin:null;
  }catch{return null}
}
export function parseHubCalendar(input:unknown,now=Date.now()):HubCalendarData {
  if(!obj(input)||input.schema!=="studyos-hub-calendar"||input.version!==1||
    !timestamp(input.generatedAt)||!timestamp(input.expiresAt)||
    Date.parse(input.generatedAt)>now+60000||Date.parse(input.expiresAt)<=now||
    Date.parse(input.expiresAt)-Date.parse(input.generatedAt)>10*60000||
    !date(input.from)||!Number.isInteger(input.days)||Number(input.days)<1||Number(input.days)>14||
    !["ready","stale","partial","disconnected"].includes(String(input.status))||
    !(input.sourceSyncedAt===null||timestamp(input.sourceSyncedAt))||
    !(input.account===null||str(input.account,254))||
    !obj(input.coverage)||!Number.isInteger(input.coverage.selectedCalendars)||
    Number(input.coverage.selectedCalendars)<0||Number(input.coverage.selectedCalendars)>8||
    typeof input.coverage.eventsCapped!=="boolean"||
    !Array.isArray(input.coverage.reasons)||input.coverage.reasons.length>5||
    input.coverage.reasons.some(x=>!str(x,80))||
    !Array.isArray(input.events)||input.events.length>160)
    throw Error("Invalid StudyOS calendar response");
  if(input.status==="disconnected"&&(input.events.length!==0||input.account!==null))
    throw Error("Disconnected calendar leaked data");
  const ids=new Set<string>();
  for(const item of input.events){
    if(!obj(item)||item.source!=="google-calendar"||!str(item.id,600)||
       !str(item.title,180)||!str(item.calendarName,120)||
       !timestamp(item.start)||!timestamp(item.end)||Date.parse(item.end)<=Date.parse(item.start)||
       typeof item.allDay!=="boolean"||typeof item.blocksTime!=="boolean"||
       !["lecture","exercise","exam","deadline","study_block","busy","other"].includes(String(item.role))||
       !(item.location===null||str(item.location,180))||ids.has(item.id))
      throw Error("Invalid StudyOS calendar event");
    ids.add(item.id);
  }
  return input as HubCalendarData;
}
export async function fetchHubCalendar(origin:string,token:string,from:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<HubCalendarData>{
  if(!hubCalendarOrigin(origin)||!date(from)||!token||token.length>16000||
    !/^[\x21-\x7e]+$/.test(token))throw Error("Calendar connection unavailable");
  const response=await fetcher(origin+"/api/hub/calendar/v1/events?from="+encodeURIComponent(from)+"&days=7",{
    method:"GET",credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",
    headers:{Accept:"application/json",Authorization:"Bearer "+token},signal
  });
  if(!response.ok){
    const issue:CalendarConnectionIssue=response.status===401?"session":
      response.status===403?"permission":response.status===404?"endpoint":
      [500,502,503,504].includes(response.status)?"source":response.status===400?"request":"network";
    throw new CalendarConnectionFailure(issue);
  }
  if(Number(response.headers.get("content-length")||0)>100000)
    throw new CalendarConnectionFailure("invalid-response");
  const body=await response.text();
  if(new TextEncoder().encode(body).byteLength>100000)
    throw new CalendarConnectionFailure("invalid-response");
  let result:unknown;
  try { result=JSON.parse(body) } catch { throw new CalendarConnectionFailure("invalid-response"); }
  if(!obj(result)||result.ok!==true)throw new CalendarConnectionFailure("invalid-response");
  let data:HubCalendarData;
  try { data=parseHubCalendar(result.data); }
  catch { throw new CalendarConnectionFailure("invalid-response"); }
  if(data.from!==from||data.days!==7)throw new CalendarConnectionFailure("invalid-response");
  return data;
}
export const calendarEsc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
