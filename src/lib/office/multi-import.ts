import {decodeMarkdownImport,MAX_IMPORT_BYTES,type MarkdownImport} from './import';
export const MAX_MULTI_IMPORT_FILES=20;
export const MAX_MULTI_IMPORT_BYTES=4_000_000;
export interface ImportFileBytes {name:string;data:ArrayBuffer}
export interface MarkdownBatch {documents:MarkdownImport[];bytes:number}
export function parseMarkdownBatch(files:readonly ImportFileBytes[]):MarkdownBatch{
 if(!files.length||files.length>MAX_MULTI_IMPORT_FILES)
  throw new Error('Choose between 1 and 20 Markdown files for a batch.');
 let total=0;const documents:MarkdownImport[]=[];
 for(const [index,file] of files.entries()){
  if(!(file.data instanceof ArrayBuffer))throw new Error('File '+(index+1)+' is not readable Markdown.');
  if(file.data.byteLength>MAX_IMPORT_BYTES)throw new Error('File '+(index+1)+' exceeds the 256 KB limit.');
  total+=file.data.byteLength;
  if(total>MAX_MULTI_IMPORT_BYTES)throw new Error('Batch exceeds the 4 MB import limit.');
  try{documents.push(decodeMarkdownImport(file.name,file.data));}
  catch(error){throw new Error('File '+(index+1)+' ('+file.name+'): '+(error instanceof Error?error.message:'invalid Markdown'));}
 }
 return {documents,bytes:total};
}
