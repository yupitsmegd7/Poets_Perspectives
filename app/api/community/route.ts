import {bridgeError,relayForUser} from '@/lib/server-bridge';
export const dynamic='force-dynamic';
const actions=new Set(['bootstrap','members','messages','reports','profile','message','block','unblock','report','moderate']);
async function handle(request:Request){
  const url=new URL(request.url),action=url.searchParams.get('action')||'bootstrap';
  if(!actions.has(action))return bridgeError(400,'Unknown community action.');
  const query=new URLSearchParams({action});
  for(const key of ['room','before','q','after']){const value=url.searchParams.get(key);if(value){if(value.length>300)return bridgeError(400,'Search is too long.');query.set(key,value);}}
  const body=request.method==='GET'?undefined:await request.text();
  if(body&&new TextEncoder().encode(body).length>12000)return bridgeError(413,'Your message is too long.');
  return relayForUser(request,'/community?'+query.toString(),body);
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
