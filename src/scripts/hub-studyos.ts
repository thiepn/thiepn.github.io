/** C1-B: explicit, ephemeral account-qualified academic source. No Hub data persistence. */
import {hubIdentity} from "./portal-auth";
import {readVerifiedHubToken} from "./hub-account";
import {academicWeekStart,studyOrigin,fetchAcademic,renderAcademic,type AcademicState} from "../lib/workspace/study-academic-read";
const root=document.querySelector<HTMLElement>("[data-workspace]");
const target=root?.querySelector<HTMLElement>("[data-hub-study-panel]");
if(root&&target){
  const workspace=root,panel=target;
  const origin=studyOrigin(import.meta.env.PUBLIC_STUDYOS_ORIGIN);
  let state:AcademicState={kind:origin?"disconnected":"unconfigured"};
  let consented=false,seq=0,abort:AbortController|null=null,expiresTimer:ReturnType<typeof setTimeout>|null=null;
  const visible=()=>workspace.dataset.calendarPrivate==="false"&&
    (workspace.dataset.view==="calendar"||
      (workspace.dataset.view==="home"&&workspace.dataset.homeMode==="today"));
  const currentDay=()=>{
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"})
      .formatToParts(new Date());
    return ["year","month","day"].map(k=>parts.find(v=>v.type===k)!.value).join("-");
  };
  const selectedDay=()=>{
    const from=new URLSearchParams(location.search).get("date");
    const isDay=!!from&&/^\d{4}-\d{2}-\d{2}$/.test(from)&&
      Number.isFinite(Date.parse(from+"T12:00:00Z"))&&new Date(from+"T12:00:00Z").toISOString().slice(0,10)===from;
    const day=workspace.dataset.view==="calendar"&&isDay?from:currentDay();
    return workspace.dataset.view==="calendar"?academicWeekStart(day):day;
  };
  const clearTimer=()=>{if(expiresTimer!==null){clearTimeout(expiresTimer);expiresTimer=null;}};
  function paint(){
    const showing=visible();panel.hidden=!showing;
    if(!showing){panel.replaceChildren();return;}
    if(state.kind==="ready"&&Date.parse(state.data.expiresAt)<=Date.now())state={kind:"stale"};
    panel.innerHTML=renderAcademic(state,origin,workspace.dataset.view==="calendar"?"week":"today");
  }
  function reset(){
    ++seq;abort?.abort();abort=null;clearTimer();consented=false;
    state={kind:origin?"disconnected":"unconfigured"};paint();
  }
  function expiry(){
    clearTimer();
    if(state.kind!=="ready")return;
    expiresTimer=setTimeout(()=>{state={kind:"stale"};paint();},Math.max(0,Date.parse(state.data.expiresAt)-Date.now()+50));
  }
  async function load(){
    if(!origin){state={kind:"unconfigured"};paint();return;}
    if(hubIdentity.status!=="signed-in"){state={kind:"signed-out"};paint();return;}
    if(!visible())return;
    const owner=hubIdentity.id,own=++seq;
    abort?.abort();clearTimer();const controller=new AbortController();abort=controller;
    const timeout=setTimeout(()=>controller.abort(),10000);
    consented=true;state={kind:"loading"};paint();
    try{
      const token=await readVerifiedHubToken(owner);
      if(!token)throw Error("Not authenticated");
      const result=await fetchAcademic(origin,token,selectedDay(),controller.signal);
      if(own!==seq||controller.signal.aborted||hubIdentity.status!=="signed-in"||
        hubIdentity.id!==owner||!visible())return;
      state=result;expiry();
    }catch{
      if(own===seq&&!controller.signal.aborted)state={kind:"unavailable"};
      else if(own===seq)state={kind:"unavailable"};
    }finally{clearTimeout(timeout);if(own===seq){abort=null;paint();}}
  }
  panel.addEventListener("click",event=>{
    const el=event.target;
    const action=el instanceof Element?el.closest<HTMLElement>("[data-action]")?.dataset.action:null;
    if(action==="study-connect")void load();
    if(action==="study-disconnect")reset();
  });
  window.addEventListener("hub:identity",reset);
  window.addEventListener("pagehide",reset);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)reset();else paint();});
  function onContextChange(){
    if(!visible()){if(consented)reset();else paint();return;}
    if(state.kind==="ready"&&state.data.coverage.from!==selectedDay()){
      if(consented)void load();else paint();
    }else paint();
  }
  new MutationObserver(onContextChange).observe(root,{
    attributes:true,attributeFilter:["data-view","data-home-mode","data-calendar-private"]});
  window.addEventListener("popstate",onContextChange);
  // Native Hub can update the selected calendar date using pushState without popstate.
  window.addEventListener("click",()=>queueMicrotask(onContextChange));
  paint();
}
