import{readHubServerEnv}from'../../../server/hub-runtime/env.js';import{handleNotesProjection}from'../../../server/hub-runtime/notes.js';
export default{fetch(request:Request){return handleNotesProjection(request,{env:readHubServerEnv()});}};
