import {MAX_BODY} from './documents';
export const MAX_IMPORT_BYTES=256_000;
export const PREVIEW_LENGTH=4_000;
export interface MarkdownImport {sourceName:string;title:string;body:string;bytes:number}
export function validateMarkdownImport(filename:string,source:string,bytes:number):MarkdownImport{
 if(typeof filename!=='string'||filename.length>255||!/\.(md|markdown)$/i.test(filename))throw new Error('Choose a .md or .markdown file, not HTML, PDF or DOCX.');
 if(!Number.isSafeInteger(bytes)||bytes<0||bytes>MAX_IMPORT_BYTES)throw new Error('Markdown import exceeds 256 KB.');
 if(typeof source!=='string'||source.length>MAX_BODY)throw new Error('Markdown content exceeds the 200,000-character Office limit.');
 const body=source.charCodeAt(0)===0xfeff?source.slice(1):source;
 if(!body.trim())throw new Error('Empty Markdown file. Nothing imported.');
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body))throw new Error('Binary or control-character content is not valid Markdown.');
 if(/^\s*(<!doctype\s+html\b|<html\b)/i.test(body))throw new Error('Active HTML documents are not accepted as Markdown.');
 if(new TextEncoder().encode(source).length>MAX_IMPORT_BYTES)throw new Error('Markdown import exceeds 256 KB.');
 const title=filename.replace(/\.(md|markdown)$/i,'').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Imported document';
 return {sourceName:filename,title,body,bytes};
}
export function decodeMarkdownImport(filename:string,data:ArrayBuffer):MarkdownImport{
 if(data.byteLength>MAX_IMPORT_BYTES)throw new Error('Markdown import exceeds 256 KB.');
 let source:string;
 try{source=new TextDecoder('utf-8',{fatal:true}).decode(data);}
 catch{throw new Error('File is not valid UTF-8 Markdown.');}
 return validateMarkdownImport(filename,source,data.byteLength);
}
