import {validPlannerDays} from '@/backend/planner.mjs';
import {bridgeError,relayForUser} from '@/lib/server-bridge';
export const dynamic='force-dynamic';
export async function GET(request:Request){return relayForUser(request,'/state');}
export async function PUT(request:Request){
 const body=await request.text();
 if(new TextEncoder().encode(body).length>1000000)return bridgeError(413,'Scrapbook exceeds the 1 MB limit. Export older pages.');
 try{const value=JSON.parse(body);if(!value.state?.profile||!Array.isArray(value.state.entries)||!Array.isArray(value.state.checks)||!Array.isArray(value.state.people)||!Array.isArray(value.state.done)||!validPlannerDays(value.state.planner))throw new Error();}catch{return bridgeError(400,'Invalid scrapbook');}
 return relayForUser(request,'/state',body);
}
