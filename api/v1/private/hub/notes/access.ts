import{readHubServerEnv}from'../../../../../server/hub-runtime/env.js';import{handleNotesAccess}from'../../../../../server/hub-runtime/notes.js';
export default{fetch(request:Request){return handleNotesAccess(request,{env:readHubServerEnv()});}};
