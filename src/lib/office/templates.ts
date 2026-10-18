export type OfficeTemplateId='blank'|'meeting'|'brief'|'report'|'study';
export interface OfficeTemplate {id:OfficeTemplateId;label:string;title:string;body:string}
export const OFFICE_TEMPLATES:readonly OfficeTemplate[]=[
{id:'blank',label:'Blank document',title:'Untitled document',body:''},
{id:'meeting',label:'Meeting notes',title:'Meeting notes',body:'# Meeting notes\n\n**Date:** [Date]\n**Participants:** [Names]\n\n## Agenda\n\n- [Topic]\n\n## Notes\n\n[Discussion]\n\n## Decisions\n\n- [Decision]\n\n## Action items\n\n- [ ] [Task] — [Owner]\n'},
{id:'brief',label:'Project brief',title:'Project brief',body:'# Project brief\n\n## Goal\n\n[What outcome matters?]\n\n## Audience\n\n[Who is this for?]\n\n## Scope\n\n- [In scope]\n- [Out of scope]\n\n## Milestones\n\n| Milestone | Target |\n| --- | --- |\n| [Deliverable] | [Date] |\n\n## Open questions\n\n- [Question]\n'},
{id:'report',label:'Structured report',title:'Report draft',body:'# Report title\n\n**Prepared on:** [Date]\n\n## Executive summary\n\n[Main findings and recommendation]\n\n## Background\n\n[Context]\n\n## Findings\n\n### Finding 1\n\n[Evidence]\n\n## Recommendations\n\n1. [Recommendation]\n\n## References\n\n- [Source]\n'},
{id:'study',label:'Study notes',title:'Study notes',body:'# Topic\n\n**Course:** [Course]\n**Lecture:** [Date or number]\n\n## Definitions\n\n- **[Term]:** [Definition]\n\n## Key results\n\n[Theorem, formula or principle]\n\n## Worked example\n\n[Problem and solution]\n\n## Questions to review\n\n- [Question]\n'}
] as const;
export function getOfficeTemplate(id:string):OfficeTemplate{
 const found=OFFICE_TEMPLATES.find(item=>item.id===id);
 if(!found)throw new Error('Unknown Office template; nothing was created.');
 return found;
}
