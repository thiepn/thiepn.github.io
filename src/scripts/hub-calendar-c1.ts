import { hubIdentity } from "./portal-auth";
import { readVerifiedHubToken } from "./hub-account";
import { calendarEsc as esc,fetchHubCalendar,hubCalendarOrigin,type HubCalendarData } from "../lib/workspace/google-calendar-c1";

const root=document.querySelector<HTMLElement>("[data-workspace]");
const panel=root?.querySelector<HTMLElement>("[data-hub-calendar-c1]");
if(root&&panel) {
  const workspace=root, view=panel;
  const origin=hubCalendarOrigin(import.meta.env.PUBLIC_STUDYOS_ORIGIN);
  let data:HubCalendarData|null=null,loading=false,error=false,generation=0;
  let controller:AbortController|null=null,timeout:ReturnType<typeof setTimeout>|null=null;
  const permitted=()=>workspace.dataset.calendarPrivate==="false"&&!document.hidden;
  const day=()=>{
    const zone=workspace.dataset.calendarZone||"Europe/Berlin";
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"})
      .formatToParts(new Date());
    return ["year","month","day"].map(k=>parts.find(p=>p.type===k)!.value).join("-");
  };
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
    const rows=data.events.slice(0,25).map(e=>'<li><time datetime="'+esc(e.start)+'">'+esc(time(e.start,e.allDay))+
      '</time><div><strong>'+esc(e.title)+'</strong><small>'+esc(e.calendarName)+
      (e.location?" · "+esc(e.location):"")+'</small></div></li>').join("");
    body.innerHTML='<p>'+esc(data.account??"Connected calendar")+' · Last StudyOS sync '+esc(t)+'</p>'+
      (warning?'<p role="status">'+esc(warning)+'</p>':"")+
      (rows?'<ol class="ws-hub-calendar-events">'+rows+'</ol>':'<p>No cached events in the selected window.</p>')+
      (data.events.length>25?'<p>Showing 25 of '+data.events.length+' cached events.</p>':"");
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
      const result=await fetchHubCalendar(origin,token,day(),signal);
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
  window.addEventListener("hub:identity",discard);
  window.addEventListener("pagehide",discard);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)discard();else render();});
  new MutationObserver(()=>{if(!permitted())discard();else render();})
    .observe(workspace,{attributes:true,attributeFilter:["data-calendar-private","data-calendar-zone"]});
  render();
}
