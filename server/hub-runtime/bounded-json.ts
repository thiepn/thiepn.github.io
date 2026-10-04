export async function readBoundedJson(body:ReadableStream<Uint8Array>|null,limit:number,signal:AbortSignal):Promise<unknown>{
  if(!body||!Number.isInteger(limit)||limit<1)throw new Error('unavailable');
  const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;
  const abort=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});
  try{
    while(true){
      signal.throwIfAborted();
      const next=await reader.read();
      signal.throwIfAborted();
      if(next.done)break;
      size+=next.value.byteLength;
      if(size>limit)throw new Error('too-large');
      parts.push(next.value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }finally{
    signal.removeEventListener('abort',abort);
    void reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
export async function readRequestJson(request:Request,limit:number,signal:AbortSignal):Promise<unknown>{
  if(!request.body||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''))throw new Error('bad-request');
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))throw new Error('too-large');
  try{return await readBoundedJson(request.body,limit,signal);}catch(error){
    if(signal.aborted)throw error;
    if(error instanceof Error&&error.message==='too-large')throw error;
    throw new Error('bad-request');
  }
}
