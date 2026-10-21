import { hubIdentity } from "./portal-auth";
import { readVerifiedHubToken } from "./hub-account";
import { calendarEsc as esc,fetchHubCalendar,hubCalendarOrigin,type HubCalendarData } from "../lib/workspace/google-calendar-c1";
import { composeCalendarView,verifiedAcademic } from "../lib/workspace/calendar-composition-c2";
import { weekDays } from "../lib/workspace/model";
import type { CalendarEvent } from "../lib/workspace/types";

const root=document.querySelector<HTMLElement>("[data-workspace]");
const panel=root?.querySelector<HTMLElement>("[data-hub-calendar-c1]");
if(root&&panel) {
  const workspace=root, view=panel;
  const origin=hubCalendarOrigin(import.meta.env.PUBLIC_STUDYOS_ORIGIN);
  let data:HubCalendarData|null=null,loading=false,error=false,generation=0;
  let local:CalendarEvent[]=[];
  let selected:string|null=null,mode:"day"|"week"="day",localTruncated=false;
  let zone="Europe/Berlin";
  let controller:AbortController|null=null,timeout:ReturnType<typeof setTimeout>|null=null;
  const visible=()=>workspace.dataset.view==="home"||workspace.dataset.view==="calendar";
  const permitted=()=>visible()&&workspace.dataset.calendarPrivate==="false"&&!document.hidden;
  const day=()=>{
    const zone=workspace.dataset.calendarZone||"Europe/Berlin";
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"})
      .formatToParts(new Date());
    return ["year","month","day"].map(k=>parts.find(p=>p.type===k)!.value).join("-");
  };
  const currentDate=()=>selected||day();
  const sourceStart=()=>mode==="week"?weekDays(currentDate())[0]!:currentDate();
  const time=(date:string,allDay:boolean)=>{
    const zone=workspace.dataset.calendarZone||"Europe/Berlin";
    return allDay?new Intl.DateTimeFormat("de-DE",{timeZone:zone,day:"2-digit",month:"2-digit"})
       .format(new Date(date))+" · All day":
       new Intl.DateTimeFormat("de-DE",{timeZone:zone,weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})
       .format(new Date(date));
  };
  function discard() {
    generation++;
    controller?.abort();controller=null;
    if(timeout)clearTimeout(timeout);timeout=null;
    data=null;loading=false;error=false;render();
  }
  function render(){
    view.hidden=!visible();
    const body=view.querySelector<HTMLElement>("[data-hub-calendar-content]");
    const actions=view.querySelector<HTMLElement>("[data-hub-calendar-actions]");
    if(!body||!actions)return;
    const expired=data&&Date.parse(data.expiresAt)<=Date.now();
    if(expired)data=null;
    const authorized=hubIdentity.status==="signed-in";
    const allowed=permitted();
    const ready=Boolean(data&&authorized&&allowed);
    actions.innerHTML=allowed&&origin&&authorized?
      '<button type="button" data-hub-calendar-load>'+ (ready?"Refresh":"Load Google Calendar")+'</button>'+
      (ready?'<button type="button" data-hub-calendar-hide>Hide events</button>':""):"";
    if(!allowed){body.textContent="Personal calendar hidden";return;}
    if(!origin){body.textContent="StudyOS calendar connection is not configured.";return;}
    if(!authorized){body.textContent="Sign in to THIEPN Account to view your Google Calendar.";return;}
    if(loading){body.textContent="Loading calendar…";return;}
    if(error){body.textContent="Calendar data unavailable. Refresh to retry.";return;}
    if(!data){body.textContent=expired?"Calendar snapshot expired. Refresh to view events.":"Load your connected StudyOS Google Calendar.";return;}
    if(data.status==="disconnected"){body.textContent="Google Calendar is not connected in StudyOS.";return;}
    const t=data.sourceSyncedAt?time(data.sourceSyncedAt,false):"Not synced";
    const warning=data.status==="stale"?"Calendar cache is stale. Refresh the source in StudyOS before relying on its availability.":data.status==="partial"?
      "Calendar coverage is incomplete.":"";
    const academic=verifiedAcademic(data.academic);
    const composition=composeCalendarView({
      local,google:data,academic,selected:currentDate(),mode,timezone:zone,
    });
    const formatHours=(n:number)=>n%60===0?n/60+"h":Math.floor(n/60)+"h "+n%60+"m";
    const sections=composition.days.map(group=>{
      const rows=group.items.slice(0,50).map(e=>
        '<li data-source-entry="'+esc(e.id)+'"><time datetime="'+esc(e.start)+'">'+
        esc(time(e.start,e.allDay))+'</time><div><strong>'+esc(e.title)+'</strong><small>'+
        esc(e.label)+' · '+esc(e.kind)+
        (e.blocksTime?" · Busy":" · Not reserved")+'</small></div>'+
        (e.owner==="studyos"&&e.sourceRoute&&origin?
          '<a href="'+esc(new URL(e.sourceRoute,origin).href)+'" rel="noreferrer">StudyOS</a>':"")+
        '</li>').join("");
      const availability=group.availableMinutes===null?
        "Free-time estimate unavailable while sources are incomplete or stale":
        "Estimated free time "+formatHours(group.availableMinutes)+
          " · study target "+formatHours(group.studyGoalMinutes);
      return '<section class="ws-hub-calendar-day"><h3>'+esc(group.date)+'</h3>'+
        '<p>'+esc(availability)+'</p>'+
        (rows?'<ol class="ws-hub-calendar-events">'+rows+'</ol>':'<p>No matching source entries.</p>')+
        (group.items.length>50?'<p>Showing 50 of '+group.items.length+' entries.</p>':"")+
        '</section>';
    }).join("");
    const partial=composition.reasons.length||localTruncated?
      '<p role="status">Calendar coverage incomplete'+(localTruncated?" · local Hub events capped":"")+
      '. Free-time estimates are not confirmed.</p>':"";
    body.innerHTML='<p>'+esc(data.account??"Connected calendar")+' · Last StudyOS sync '+esc(t)+'</p>'+
      (warning?'<p role="status">'+esc(warning)+'</p>':"")+partial+
      '<p>Study hours assume 08:00–20:00, proposed 12:30–13:15 and 18:00–18:45 meal breaks, '+
      'and 3h 30m maximum each weekend day. No reservations created.</p>'+sections;
  }
  async function load(){
    if(!origin||!permitted()||hubIdentity.status!=="signed-in")return;
    const owner=hubIdentity.id,own=++generation;
    controller?.abort();if(timeout)clearTimeout(timeout);
    controller=new AbortController();const signal=controller.signal;
    timeout=setTimeout(()=>controller?.abort(),8000);
    data=null;loading=true;error=false;render();
    try{
      const token=await readVerifiedHubToken(owner);
      if(!token)throw Error("Unverified Account");
      if(own!==generation||!permitted()||hubIdentity.status!=="signed-in"||hubIdentity.id!==owner)return;
      const result=await fetchHubCalendar(origin,token,sourceStart(),signal);
      if(own!==generation||!permitted()||hubIdentity.status!=="signed-in"||hubIdentity.id!==owner)return;
      data=result;
    }catch{
      if(own===generation&&!signal.aborted)error=true;
    }finally{
      if(own===generation){loading=false;controller=null;if(timeout)clearTimeout(timeout);timeout=null;render();}
    }
  }
  view.addEventListener("click",event=>{
    const el=event.target instanceof Element?event.target.closest<HTMLElement>("button"):null;
    if(el?.hasAttribute("data-hub-calendar-load"))void load();
    if(el?.hasAttribute("data-hub-calendar-hide"))discard();
  });
  // Read the original calendar through its owner's nonpersistent, read-only
  // in-page projection. Never access or mutate Hub's local persistence here.
  window.addEventListener("hub:calendar-local",(event:Event)=>{
    const p=(event as CustomEvent).detail as {
      selected?:unknown;mode?:unknown;timezone?:unknown;private?:unknown;
      events?:unknown;truncated?:unknown;
    }|undefined;
    if(!p||p.private!==false||workspace.dataset.calendarPrivate!=="false") {
      local=[];selected=null;localTruncated=false;render();return;
    }
    if(typeof p.selected!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(p.selected)||
       !["day","week"].includes(String(p.mode))||
       typeof p.timezone!=="string"||!Array.isArray(p.events))return;
    local=p.events.slice(0,300) as CalendarEvent[];
    localTruncated=p.truncated===true;
    selected=p.selected;mode=p.mode==="week"?"week":"day";zone=p.timezone;
    render();
  });
  window.dispatchEvent(new Event("hub:calendar-local-request"));
  window.addEventListener("hub:identity",()=>{local=[];selected=null;discard();});
  window.addEventListener("pagehide",()=>{local=[];discard();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){local=[];discard();}else render();});
  new MutationObserver(()=>{if(!permitted()){local=[];discard();}else render();})
    .observe(workspace,{attributes:true,attributeFilter:["data-calendar-private","data-calendar-zone","data-view"]});
  render();
}
