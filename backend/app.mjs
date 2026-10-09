import {timingSafeEqual} from 'node:crypto';
import {validPlannerDays} from './planner.mjs';
import {actorIdValid,RequestError} from './community-rules.mjs';
import {communityRequest} from './community.mjs';

export function createBridgeHandler(db,{token,moderatorIds=[]}){
  return async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-PP-Storage-Version','2');
    const reply=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
    const actual=Buffer.from(req.headers.authorization||''),expected=Buffer.from(`Bearer ${token}`);
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'Unauthorized'});
    const userId=req.headers['x-pp-user-id'];
    if(!actorIdValid(userId))return reply(401,{error:'An authenticated user is required.'});
    try{
      const url=new URL(req.url,'http://bridge.internal');
      if(url.pathname==='/capabilities'&&req.method==='GET')return reply(200,{storageVersion:2,community:true});
      if(!['/state','/community'].includes(url.pathname))return reply(404,{error:'Not found'});
      if(!['GET','PUT','POST','DELETE'].includes(req.method))return reply(405,{error:'Method not allowed'});
      let body={};
      if(req.method!=='GET'){
        const chunks=[];let bytes=0;const limit=url.pathname==='/state'?1000000:12000;
        for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)throw new RequestError(413,'Request is too large.');chunks.push(chunk);}
        try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();}catch{throw new RequestError(400,'Invalid JSON request.');}
      }
      if(url.pathname==='/community'){
        const result=await communityRequest(db,userId,req.method,url,body,moderatorIds);return reply(result.status,result.data);
      }
      const states=db.collection('scrapbooks');
      if(req.method==='GET'){const doc=await states.findOne({_id:`user:${userId}`});return reply(200,{connected:true,state:doc?.state??null});}
      if(req.method==='PUT'){
        const {state}=body;
        if(!state||!state.profile||typeof state.profile!=='object'||!['entries','checks','people','done'].every(k=>Array.isArray(state[k]))||!validPlannerDays(state.planner))throw new RequestError(400,'Invalid scrapbook');
        await states.updateOne({_id:`user:${userId}`},{$set:{state,updatedAt:new Date()}},{upsert:true});return reply(200,{saved:true});
      }
      reply(405,{error:'Method not allowed'});
    }catch(error){
      if(!(error instanceof RequestError))console.error('Storage operation failed:',error.name);
      reply(error instanceof RequestError?error.status:500,{error:error instanceof RequestError?error.message:'Storage operation failed. Please try again.'});
    }
  };
}
