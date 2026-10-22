import { hubIdentity } from "./portal-auth";
import { readVerifiedHubToken } from "./hub-account";
import { calendarEsc as esc,fetchHubCalendar,hubCalendarOrigin,CalendarConnectionFailure,type CalendarConnectionIssue,type HubCalendarData } from "../lib/workspace/google-calendar-c1";
import { composeCalendarView,verifiedAcademic } from "../lib/workspace/calendar-composition-c2";
import { weekDays } from "../lib/workspace/model";
import type { CalendarEvent } from "../lib/workspace/types";
import { parseStudyRoadmap,roadmapWeekForDate,weekCourseTargets,type ImportedStudyRoadmap } from "../lib/workspace/study-roadmap-c3";
import { verifyNativeStudyPlan } from "../lib/workspace/study-week-c3";

const root=document.querySelector<HTMLElement>("[data-workspace]");
const panel=root?.querySelector<HTMLElement>("[data-hub-calendar-c1]");
if(root&&panel) {
  const workspace=root, view=panel;
  const origin=hubCalendarOrigin(import.meta.env.PUBLIC_STUDYOS_ORIGIN);
  let data:HubCalendarData|null=null,loading=false,error:CalendarConnectionIssue|null=null,generation=0;
  let local:CalendarEvent[]=[];
  let selected:string|null=null,mode:"day"|"week"="day",localTruncated=false;
  let zone="Europe/Berlin";
  let roadmap:ImportedStudyRoadmap|null=null,roadmapError="",importEpoch=0;
  let controller:AbortController|null=null,timeout:ReturnType<typeof setTimeout>|null=null;
  let expiryTimer:ReturnType<typeof setTimeout>|null=null;
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
  function clearRoadmap(){
    importEpoch++;roadmap=null;roadmapError="";
    const file=view.querySelector<HTMLInputElement>("[data-hub-study-file]");
    if(file)file.value="";
  }
  function renderRoadmap(){
    const status=view.querySelector<HTMLElement>("[data-hub-study-status]");
    const body=view.querySelector<HTMLElement>("[data-hub-study-content]");
    const file=view.querySelector<HTMLInputElement>("[data-hub-study-file]");
    const clear=view.querySelector<HTMLButtonElement>("[data-hub-study-clear]");
    if(!status||!body||!file||!clear)return;
    const allowed=permitted()&&hubIdentity.status==="signed-in";
    file.disabled=!allowed;
    clear.hidden=!allowed||!roadmap;
    if(!allowed){
      status.textContent="Sign in and show personal content to open your StudyOS roadmap.";
      body.replaceChildren();return;
    }
    const native=verifyNativeStudyPlan(data?.studyPlan);
    const date=currentDate();
    const live=native?.weeks.find(w=>w.start<=date&&w.end>=date);
    const week=roadmap?roadmapWeekForDate(roadmap,date):null;
    status.textContent=roadmapError||
      (live?"Active committed StudyOS week · revision "+live.revision:
        week?"Imported StudyOS roadmap · not committed as a weekly plan":
        loading?"Loading StudyOS weekly plan…":
        error?"StudyOS plan could not be loaded. Use Open weekly plan or retry the connection.":
        !data?"Load the StudyOS connection to check committed weekly targets.":
        native?.status==="no_active_week"?"No committed StudyOS week for this date. Open weekly plan to create one.":
        native?.status==="partial"?"StudyOS weekly coverage is incomplete. Open weekly plan to verify.":
        "No StudyOS weekly plan available for this date.");
    if(live){
      const entries=live.courses.map(w=>
        "<li><strong>"+esc(w.label)+"</strong> · "+esc((w.targetMinutes/60).toFixed(1))+
        "h · "+esc(w.actionTitle)+"</li>").join("");
      body.innerHTML="<p>"+esc(live.start)+"–"+esc(live.end)+" · "+esc(live.objective)+"</p>"+
        "<ul>"+entries+"</ul>";
    }else if(week){
      const targets=weekCourseTargets(week);
      body.innerHTML="<p>Week "+week.week+" · "+esc(week.start)+"–"+esc(week.end)+
        " · "+esc(week.independent_budget_hours)+"h proposed independent study</p>"+
        "<h4>"+esc(week.focus)+"</h4>"+
        "<ul>"+targets.map(t=>"<li><strong>"+esc(t.course)+"</strong> · "+esc((t.minutes/60).toFixed(1))+"h</li>").join("")+"</ul>"+
        "<p>"+esc(week.actions)+"</p>"+
        "<p><strong>Checkpoint:</strong> "+esc(week.checkpoint)+"</p>"+
        "<p><strong>If blocked:</strong> "+esc(week.fallback)+"</p>";
    }else{
      body.textContent=native?.status==="partial"?
        "StudyOS weekly coverage incomplete; consult the original weekly plan.":
        "No weekly course targets are loaded for this date.";
    }
    // Calendar gaps remain proposals. Stale, incomplete or absent Google
    // coverage must never be used to claim verified free time.
    if(data){
      const academic=verifiedAcademic(data.academic);
      const combined=composeCalendarView({local,google:data,academic,
        selected:date,mode,timezone:zone,capacityOverrides:native?.capacities});
      const segments=combined.days.map(d=>
        "<li>"+esc(d.date)+" · "+(d.availableMinutes===null?
          "Availability unverified":esc((d.availableMinutes/60).toFixed(1))+"h unreserved capacity")+
          (d.availableWindows.length?
            " · "+d.availableWindows.slice(0,2).map(v=>esc(time(v.start,false))+
              "–"+esc(new Intl.DateTimeFormat("de-DE",{timeZone:zone,hour:"2-digit",minute:"2-digit"}).format(new Date(v.end)))).join(" / "):"")+
          "</li>").join("");
      body.innerHTML+="<h4>Available windows · not booked</h4><ul>"+segments+"</ul>";
    }
  }
  function discard() {
    generation++;
    controller?.abort();controller=null;
    if(timeout)clearTimeout(timeout);timeout=null;
    if(expiryTimer)clearTimeout(expiryTimer);expiryTimer=null;
    data=null;loading=false;error=null;render();
  }
  function render(){
    view.hidden=!visible();
    const body=view.querySelector<HTMLElement>("[data-hub-calendar-content]");
    const actions=view.querySelector<HTMLElement>("[data-hub-calendar-actions]");
    if(!body||!actions)return;
    const expired=data&&Date.parse(data.expiresAt)<=Date.now();
    if(expired){data=null;if(expiryTimer)clearTimeout(expiryTimer);expiryTimer=null;}
    renderRoadmap();
    const authorized=hubIdentity.status==="signed-in";
    const allowed=permitted();
    const ready=Boolean(data&&authorized&&allowed);
    actions.innerHTML=allowed&&origin&&authorized?
      '<button type="button" data-hub-calendar-load>'+ (ready?"Refresh":"Load Google Calendar")+'</button>'+
      '<a href="https://study.thiepn.dev/#today-schedule" target="_blank" rel="noopener noreferrer">Manage in StudyOS</a>'+
      (ready?'<button type="button" data-hub-calendar-hide>Hide events</button>':""):"";
    if(!allowed){body.textContent="Personal calendar hidden";return;}
    if(!origin){body.textContent="StudyOS calendar connection is not configured.";return;}
    if(!authorized){body.textContent="Sign in to THIEPN Account to view your Google Calendar.";return;}
    if(loading){body.textContent="Loading calendar…";return;}
    if(error){
      body.textContent=({
        session:"THIEPN Account session needs to be refreshed. Sign in again.",
        permission:"StudyOS rejected this Account's calendar access. Reconnect your Account in StudyOS.",
        endpoint:"StudyOS calendar service is not deployed. The Hub cannot load it yet.",
        source:"StudyOS could not read the connected calendar. Check the source in StudyOS.",
        network:"Cannot reach StudyOS. Check your connection and retry.",
        timeout:"StudyOS did not respond in time. Retry the calendar connection."
      } satisfies Record<CalendarConnectionIssue,string>)[error];
      return;
    }
    if(!data){body.textContent=expired?"Calendar snapshot expired. Refresh to view events.":"Load your connected StudyOS Google Calendar.";return;}
    if(data.status==="disconnected"){body.textContent="Google Calendar is not connected. Use Manage in StudyOS to connect it.";return;}
    const t=data.sourceSyncedAt?time(data.sourceSyncedAt,false):"Not synced";
    const warning=data.status==="stale"?"Calendar cache is stale. Refresh the source in StudyOS before relying on its availability.":data.status==="partial"?
      "Calendar coverage is incomplete.":"";
    const academic=verifiedAcademic(data.academic);
    const composition=composeCalendarView({
      local,google:data,academic,selected:currentDate(),mode,timezone:zone,
      capacityOverrides:verifyNativeStudyPlan(data.studyPlan)?.capacities,
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
    data=null;loading=true;error=null;render();
    try{
      const token=await readVerifiedHubToken(owner);
      if(!token)throw new CalendarConnectionFailure("session");
      if(own!==generation||!permitted()||hubIdentity.status!=="signed-in"||hubIdentity.id!==owner)return;
      const result=await fetchHubCalendar(origin,token,sourceStart(),signal);
      if(own!==generation||!permitted()||hubIdentity.status!=="signed-in"||hubIdentity.id!==owner)return;
      data=result;
      if(expiryTimer)clearTimeout(expiryTimer);
      // The source validity window is owned by StudyOS, not Hub's local clock
      // or a persistent timer. Expiry clears only the projection, not a user-
      // explicitly imported private roadmap.
      expiryTimer=setTimeout(()=>{
        if(own===generation&&data?.expiresAt===result.expiresAt){
          data=null;expiryTimer=null;render();
        }
      },Math.max(0,Date.parse(result.expiresAt)-Date.now()+25));
    }catch(cause){
      if(own===generation)error=signal.aborted?"timeout":
        cause instanceof CalendarConnectionFailure?cause.issue:"network";
    }finally{
      if(own===generation){loading=false;controller=null;if(timeout)clearTimeout(timeout);timeout=null;render();}
    }
  }
  view.querySelector<HTMLInputElement>("[data-hub-study-file]")?.addEventListener("change",async event=>{
    const input=event.currentTarget as HTMLInputElement;
    const file=input.files?.[0];
    if(!file||!permitted()||hubIdentity.status!=="signed-in")return;
    const owner=hubIdentity.id,own=++importEpoch;
    roadmap=null;roadmapError="";
    try{
      if(file.size>100000||file.size===0||!file.name.toLowerCase().endsWith(".json"))
        throw Error("Choose a StudyOS roadmap JSON file below 100 KB.");
      const raw=await file.text();
      if(own!==importEpoch||!permitted()||hubIdentity.status!=="signed-in"||hubIdentity.id!==owner)return;
      const validated=parseStudyRoadmap(JSON.parse(raw) as unknown);
      if(own!==importEpoch||!permitted()||hubIdentity.id!==owner)return;
      roadmap=validated;
    }catch{
      if(own===importEpoch)roadmapError="Invalid StudyOS roadmap JSON. No records changed.";
    }finally{
      if(own===importEpoch)renderRoadmap();
    }
  });
  view.addEventListener("click",event=>{
    const el=event.target instanceof Element?event.target.closest<HTMLElement>("button"):null;
    if(el?.hasAttribute("data-hub-calendar-load"))void load();
    if(el?.hasAttribute("data-hub-calendar-hide"))discard();
    if(el?.hasAttribute("data-hub-study-clear")){clearRoadmap();renderRoadmap();}
  });
  // Read the original calendar through its owner's nonpersistent, read-only
  // in-page projection. Never access or mutate Hub's local persistence here.
  window.addEventListener("hub:calendar-local",(event:Event)=>{
    const p=(event as CustomEvent).detail as {
      selected?:unknown;mode?:unknown;timezone?:unknown;private?:unknown;
      events?:unknown;truncated?:unknown;
    }|undefined;
    if(!p||p.private!==false||workspace.dataset.calendarPrivate!=="false") {
      local=[];selected=null;localTruncated=false;clearRoadmap();render();return;
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
  window.addEventListener("hub:identity",()=>{local=[];selected=null;clearRoadmap();discard();});
  window.addEventListener("pagehide",()=>{local=[];clearRoadmap();discard();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){local=[];clearRoadmap();discard();}else render();});
  new MutationObserver(()=>{if(!permitted()){local=[];clearRoadmap();discard();}else render();})
    .observe(workspace,{attributes:true,attributeFilter:["data-calendar-private","data-calendar-zone","data-view"]});
  render();
}
