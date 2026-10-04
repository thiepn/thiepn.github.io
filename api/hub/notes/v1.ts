import{readHubServerEnv}from'../../../server/hub-runtime/env';import{handleNotesProjection}from'../../../server/hub-runtime/notes';
export default{fetch(request:Request){return handleNotesProjection(request,{env:readHubServerEnv()});}};
