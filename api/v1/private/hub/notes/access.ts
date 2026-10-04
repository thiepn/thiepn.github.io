import{readHubServerEnv}from'../../../../../server/hub-runtime/env';import{handleNotesAccess}from'../../../../../server/hub-runtime/notes';
export default{fetch(request:Request){return handleNotesAccess(request,{env:readHubServerEnv()});}};
