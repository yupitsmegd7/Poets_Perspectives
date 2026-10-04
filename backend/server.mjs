import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {MongoClient} from 'mongodb';
const {MONGODB_URI,MONGODB_BRIDGE_TOKEN,PORT=8080}=process.env;
if(!MONGODB_URI||!MONGODB_BRIDGE_TOKEN||MONGODB_BRIDGE_TOKEN.length<32)throw new Error('Set MONGODB_URI and a random bridge token of at least 32 characters.');
const client=new MongoClient(MONGODB_URI);await client.connect();
const states=client.db('poets_perspectives').collection('scrapbooks');
const server=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const reply=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
 const actual=Buffer.from(req.headers.authorization||''),expected=Buffer.from(`Bearer ${MONGODB_BRIDGE_TOKEN}`);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'Unauthorized'});
 if(req.url!=='/state')return reply(404,{error:'Not found'});
 try{
  if(req.method==='GET'){const doc=await states.findOne({_id:'private-owner'});return reply(200,{connected:true,state:doc?.state??null});}
  if(req.method==='PUT'){
   let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>1000000)return reply(413,{error:'Maximum 1 MB'});body+=chunk;}
   const {state}=JSON.parse(body);if(!state||typeof state.profile!=='object'||!['entries','checks','people','done'].every(k=>Array.isArray(state[k])))return reply(400,{error:'Invalid scrapbook'});
   await states.updateOne({_id:'private-owner'},{$set:{state,updatedAt:new Date()}},{upsert:true});return reply(200,{saved:true});
  }reply(405,{error:'Method not allowed'});
 }catch{reply(500,{error:'Storage operation failed'});}
});server.listen(Number(PORT));
process.on('SIGTERM',()=>server.close(async()=>{await client.close();process.exit(0)}));
