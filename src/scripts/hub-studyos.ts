/** Read-only C1 presentation mounted beside native Hub Today/Week, no shadow task store. */
import {hubIdentity} from "./portal-auth";
import {readVerifiedHubToken} from "./hub-account";
import {studyOrigin,fetchAcademic,renderAcademic,type AcademicState} from "../lib/workspace/study-academic-read";
const root=document.querySelector<HTMLElement>("[data-workspace]");
const target=root?.querySelector<HTMLElement>("[data-hub-study-panel]");
if(root&&target&&["home","calendar"].includes(root.dataset.view||"")){
  const origin=studyOrigin(import.meta.env.PUBLIC_STUDYOS_ORIGIN);
  let state:AcademicState={kind:origin?"disconnected":"unconfigured"},consented=false,seq=0,abort:AbortController|null=null;
  let activeOwner:string|null=null;
  const visible=()=>root.dataset.calendarPrivate!=="true" &&
    (root.dataset.view==="calendar"||(root.dataset.view==="home"&&root.dataset.homeMode==="today"));
  const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Berlin"});
  const selectedDay=()=>root.dataset.view==="calendar"&&/^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get("date")||"")
    ? new URLSearchParams(location.search).get("date")!:today();
  function paint(){target.hidden=!visible();target.innerHTML=target.hidden?"":renderAcademic(state,origin,root.dataset.view==="calendar"?"week":"today");}
  function reset(){++seq;abort?.abort();abort=null;consented=false;activeOwner=null;state={kind:origin?"disconnected":"unconfigured"};paint();}
  async function load(){
    if(!origin||hubIdentity.status!=="signed-in"||!visible()){state={kind:origin?"unavailable":"unconfigured"};paint();return;}
    const owner=hubIdentity.id,own=++seq;abort?.abort();const controller=new AbortController();abort=controller;
    consented=true;activeOwner=owner;state={kind:"loading"};paint();
    try{
      const token=await readVerifiedHubToken(owner);
      if(!token)throw Error("Not authenticated");
      const result=await fetchAcademic(origin,token,selectedDay(),controller.signal);
      if(own!==seq||controller.signal.aborted||hubIdentity.status!=="signed-in"||
        hubIdentity.id!==owner||root.dataset.calendarPrivate==="true"||!visible())return;
      state=result;
    }catch{if(own!==seq||controller.signal.aborted)return;state={kind:"unavailable"};}
    finally{if(own===seq){abort=null;paint();}}
  }
  target.addEventListener("click",event=>{
    const action=(event.target as Element).closest<HTMLElement>("[data-action]")?.dataset.action;
    if(action==="study-connect")void load();
    if(action==="study-disconnect")reset();
  });
  window.addEventListener("hub:identity",reset);
  window.addEventListener("pagehide",reset);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)reset()});
  new MutationObserver(()=>{if(consented&&!visible())reset();else paint()})
    .observe(root,{attributes:true,attributeFilter:["data-home-mode","data-calendar-private"]});
  window.addEventListener("popstate",paint);
  paint();
}
