import {MAX_BODY,validateDocument,type OfficeDocument} from './documents';
import {reviewOfficeProseCitations,type OfficeProseCitationParagraph} from './footnotes';

export const MAX_OFFICE_TRANSFER_PARAGRAPHS=12;
export const MAX_OFFICE_TRANSFER_CHARS=3200;

export interface OfficeTransferPassage extends OfficeProseCitationParagraph{
  eligible:boolean;reason:string;
}
export interface OfficeTransferReview{
  sourceId:string;sourceRevision:number;sourceTitle:string;
  passages:OfficeTransferPassage[];eligible:number;
}
export interface OfficeTransferPreview{
  value:string;count:number;offsets:number[];sourceId:string;sourceRevision:number;
}
/** Reuse the original prose/citation scanner, with no second Markdown parser. */
export function reviewOfficeTransferSource(source:OfficeDocument):OfficeTransferReview{
  validateDocument(source);
  const paragraphs=reviewOfficeProseCitations(source.body).paragraphs.map(p=>{
    const exact=source.body.slice(p.offset,p.end);
    const problem=p.citationIds.length?'Contains local footnote references':
      /\]\(#office-ref-[a-z0-9-]+\)/.test(exact)?'Contains local heading references':
      exact.length>MAX_OFFICE_TRANSFER_CHARS?'Passage exceeds 3,200 characters':'';
    return {...p,eligible:!problem,reason:problem};
  });
  return {sourceId:source.id,sourceRevision:source.revision,sourceTitle:source.title,
    passages:paragraphs,eligible:paragraphs.filter(p=>p.eligible).length};
}
/** Append selected original prose as attributed blockquotes, without rewriting
 * the original document or transferring locally scoped citation identities.
 */
export function previewOfficeExcerptTransfer(
  targetBody:string,source:OfficeDocument,offsets:readonly number[]
):OfficeTransferPreview{
  if(typeof targetBody!=='string'||targetBody.length>MAX_BODY)
    throw new Error('Target Office document exceeds its source limit.');
  if(!offsets.length||offsets.length>MAX_OFFICE_TRANSFER_PARAGRAPHS||
     new Set(offsets).size!==offsets.length)
    throw new Error('Choose 1–12 distinct original source paragraphs.');
  const review=reviewOfficeTransferSource(source);
  const matches=new Map(review.passages.map(p=>[p.offset,p]));
  const selected=[...offsets].sort((a,b)=>a-b).map(offset=>{
    if(!Number.isSafeInteger(offset)||!matches.has(offset))
      throw new Error('An original source paragraph changed. Review again.');
    const match=matches.get(offset)!;
    if(!match.eligible)throw new Error(match.reason+'. Choose a citation-free original paragraph.');
    return match;
  });
  const title=source.title.replace(/\s+/g,' ').trim();
  if(!title)throw new Error('Source document has no original title.');
  // Original source body is never modified. Only excerpts receive line-normalized
  // Markdown quote markers, with local-document provenance (not an external citation).
  const blocks=selected.map(p=>{
    const text=source.body.slice(p.offset,p.end);
    if(!text||text.length>MAX_OFFICE_TRANSFER_CHARS)
      throw new Error('Source passage changed. Nothing applied.');
    return ['> Office source: '+title+' · line '+p.line,
      ...text.split(/\r\n|\r|\n/).map(line=>'> '+line)].join('\n');
  });
  const prefix=!targetBody?'':targetBody.endsWith('\n\n')?'':targetBody.endsWith('\n')?'\n':'\n\n';
  const result=targetBody+prefix+blocks.join('\n\n')+'\n';
  if(result.length>MAX_BODY)
    throw new Error('Transferred passages exceed the 200,000-character target limit.');
  return {value:result,count:selected.length,offsets:selected.map(p=>p.offset),
    sourceId:source.id,sourceRevision:source.revision};
}
