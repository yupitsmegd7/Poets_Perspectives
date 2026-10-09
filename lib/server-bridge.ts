import {getChatGPTUser} from '@/app/chatgpt-auth';

const responseHeaders={'Cache-Control':'no-store','Vary':'Cookie'};
export function bridgeError(status:number,error:string,code='unavailable'){
  return Response.json({connected:false,error,code},{status,headers:responseHeaders});
}
export async function signedInStorageKey(){
  if(process.env.VERCEL)return null;
  const user=await getChatGPTUser();if(!user)return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`poets-perspectives\0${user.userId}`));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function relayForUser(request:Request,path:string,body?:string){
  const base=process.env.MONGODB_BRIDGE_URL,secret=process.env.MONGODB_BRIDGE_TOKEN;
  if(!base||!secret)return bridgeError(503,'The community is not open yet. Shared storage still needs to be connected.','not_configured');
  // These forwarded identities are trusted only behind Sites dispatch, never on Vercel.
  if(process.env.VERCEL)return bridgeError(503,'Sign-in needs to be configured for this hosting provider.','auth_setup');
  if(request.method!=='GET'){
    const origin=request.headers.get('origin');
    if(origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return bridgeError(403,'Please send this request from the website.','forbidden');
  }
  const userId=await signedInStorageKey();
  if(!userId)return bridgeError(401,'Sign in to join the community.','sign_in');
  if(path==='/state'&&request.headers.get('x-pp-viewer')!==userId)return bridgeError(409,'Your signed-in account changed. Export unsaved pages and reload before saving.','account_changed');
  try{
    const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password)throw new Error('HTTPS backend required');
    const root=base.replace(/\/$/,'');
    const headers={Authorization:`Bearer ${secret}`,'Content-Type':'application/json','X-PP-User-Id':userId};
    // Never write through the earlier single-owner bridge after opening a community.
    const capability=await fetch(root+'/capabilities',{headers,signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!capability.ok||(await capability.json() as {storageVersion?:number}).storageVersion!==2)return bridgeError(503,'The shared storage service needs its latest update.','backend_upgrade');
    const result=await fetch(root+path,{method:request.method,headers,body,signal:AbortSignal.timeout(10000),redirect:'error'});
    if(result.headers.get('x-pp-storage-version')!=='2')throw new Error('Unexpected backend version');
    const data=await result.json();
    return Response.json(data,{status:result.status,headers:responseHeaders});
  }catch{return bridgeError(502,'The conversation could not be reached. Your unsent words are still here. Please try again.');}
}
