import {getFaithTmsDue,clearFaithTmsDue} from '../lib/workspace/faith-source-session';
/** Only displays data that the original TMS60 Hub session already approved. */
function updateFaithTms(){
  const element=document.querySelector<HTMLElement>('[data-fd1-tms]');
  if(!element || document.hidden)return;
  const granted=getFaithTmsDue();
  element.textContent=granted
    ? `TMS60 authorized summary: ${granted.dueTaskCount} review tasks across ${granted.dueVerseCount} due verses · ${granted.newVerseCount} new verses (observed ${granted.observedAt}).`
    : 'TMS60 progress is unavailable until the original TMS60 Hub summary is authorized and opened.';
}
document.addEventListener('hub:faith-source-updated',updateFaithTms);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearFaithTmsDue();else updateFaithTms();
});
window.addEventListener('hub:identity',clearFaithTmsDue);
window.addEventListener('pagehide',clearFaithTmsDue);
