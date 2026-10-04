// Private owner-only Site. Never expose the bridge secret in browser code.
export async function GET(){return relay('GET');}
export async function PUT(request:Request){
 const body=await request.text();
 if(body.length>1000000)return Response.json({error:'Scrapbook exceeds the 1 MB limit. Export older pages.'},{status:413});
 try{const value=JSON.parse(body);if(!value.state?.profile||!Array.isArray(value.state.entries)||!Array.isArray(value.state.checks)||!Array.isArray(value.state.people)||!Array.isArray(value.state.done))throw new Error();}catch{return Response.json({error:'Invalid scrapbook'},{status:400});}
 return relay('PUT',body);
}
async function relay(method:string,body?:string){
 const url=process.env.MONGODB_BRIDGE_URL,key=process.env.MONGODB_BRIDGE_TOKEN;
 if(!url||!key)return Response.json({connected:false,error:'MongoDB connection is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{if(!url.startsWith('https://'))throw new Error('HTTPS required');const r=await fetch(url.replace(/\/$/,'')+'/state',{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Database unavailable');return Response.json(await r.json(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Cloud storage unavailable'},{status:502});}
}
