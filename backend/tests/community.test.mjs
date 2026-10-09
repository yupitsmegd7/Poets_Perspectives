import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createBridgeHandler} from '../app.mjs';
import {cleanProfile,cleanMessage,decodeCursor,publicMember} from '../community-rules.mjs';

// In-memory MongoDB contract fixture for route/authorization tests, not production storage.
function memoryDatabase(){
  const collections=new Map();
  const value=v=>v instanceof Date?v.getTime():v;
  function matches(row,filter){return Object.entries(filter).every(([key,expected])=>{
    if(key==='$or')return expected.some(part=>matches(row,part));
    const actual=row[key];
    if(expected instanceof Date)return value(actual)===value(expected);
    if(expected&&typeof expected==='object')return Object.entries(expected).every(([operator,target])=>{
      if(operator==='$in')return target.includes(actual);
      if(operator==='$nin')return !target.includes(actual);
      if(operator==='$ne')return actual!==target;
      if(operator==='$gt')return value(actual)>value(target);
      if(operator==='$lt')return value(actual)<value(target);
      if(operator==='$options')return true;
      if(operator==='$regex')return new RegExp(target,expected.$options||'').test(Array.isArray(actual)?actual.join(' '):actual||'');
      throw new Error('Unsupported fixture operator '+operator);
    });
    return actual===expected;
  });}
  function patch(row,change,insert){
    if(insert)Object.assign(row,structuredClone(change.$setOnInsert||{}));
    Object.assign(row,structuredClone(change.$set||{}));
    for(const [key,n] of Object.entries(change.$inc||{}))row[key]=(row[key]||0)+n;
  }
  return {collection(name){
    if(collections.has(name))return collections.get(name);
    const rows=[];
    const collection={
      async findOne(filter){return structuredClone(rows.find(row=>matches(row,filter))||null);},
      find(filter){let result=rows.filter(row=>matches(row,filter));return {sort(order){result.sort((a,b)=>{for(const [key,direction] of Object.entries(order)){if(value(a[key])!==value(b[key]))return (value(a[key])>value(b[key])?1:-1)*direction;}return 0;});return this;},limit(n){result=result.slice(0,n);return this;},async toArray(){return structuredClone(result);}};},
      async countDocuments(filter){return rows.filter(row=>matches(row,filter)).length;},
      async insertOne(row){if(rows.some(item=>item._id===row._id))throw Object.assign(new Error('duplicate'),{code:11000});rows.push(structuredClone(row));},
      async updateOne(filter,change,options={}){let row=rows.find(row=>matches(row,filter));const found=Boolean(row);if(!row&&options.upsert){row={_id:filter._id};rows.push(row);}if(row)patch(row,change,!found);return {matchedCount:Number(found)};},
      async findOneAndUpdate(filter,change,options){await this.updateOne(filter,change,options);return this.findOne(filter);},
      async updateMany(filter,change){for(const row of rows.filter(row=>matches(row,filter)))patch(row,change,false);},
      async deleteOne(filter){const index=rows.findIndex(row=>matches(row,filter));if(index>=0)rows.splice(index,1);},
    };
    collections.set(name,collection);return collection;
  }};
}
const alice='a'.repeat(64),bob='b'.repeat(64),moderator='c'.repeat(64),token='test-only-token-'.repeat(3);

test('community HTTP flow: two people, private journals, ownership, replies, reporting and blocking',async t=>{
  const db=memoryDatabase();
  const server=createServer(createBridgeHandler(db,{token,moderatorIds:[moderator]}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const root=`http://127.0.0.1:${server.address().port}`;
  async function request(user,path,method='GET',body,authorized=true){
    const headers={'Content-Type':'application/json'};
    if(authorized)headers.Authorization=`Bearer ${token}`;
    if(user)headers['X-PP-User-Id']=user;
    const res=await fetch(root+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:res.status,data:await res.json()};
  }
  const community=(user,action,method='GET',body,extra='')=>request(user,'/community?action='+action+extra,method,body);
  assert.equal((await request(alice,'/state','GET',undefined,false)).status,401);
  assert.equal((await request(null,'/state')).status,401);
  assert.equal((await request('private-owner','/state')).status,401);
  assert.equal((await request(alice,'/capabilities')).data.storageVersion,2);
  await db.collection('scrapbooks').insertOne({_id:'private-owner',state:{secret:'old owner'}});
  assert.equal((await request(alice,'/state')).data.state,null,'Legacy owner document never leaks');
  const state={profile:{name:'Alice',history:'Private history'},entries:[],checks:[],people:[],done:[],planner:[]};
  assert.equal((await request(alice,'/state','PUT',{state,userId:bob})).status,200);
  assert.equal((await request(bob,'/state')).data.state,null,'Other person cannot read journal');
  assert.deepEqual((await request(alice,'/state')).data.state,state);
  const newMessage={id:randomUUID(),room:'hearth',body:'Hello from Alice',replyTo:null};
  assert.equal((await community(alice,'message','POST',newMessage)).status,403,'Joining is explicit');
  for(const [user,alias] of [[alice,'Alice'],[bob,'Bob'],[moderator,'Mod']]){
    assert.equal((await community(user,'profile','POST',{alias,bio:'Reading in the garden',interests:['Poetry'],agreed:true,userId:bob,history:'should not copy'})).status,200);
  }
  const bootstrap=(await community(alice,'bootstrap')).data;
  assert.equal(bootstrap.memberCount,3);assert.equal(bootstrap.me.id,alice);assert.equal('history' in bootstrap.me,false);assert.equal('email' in bootstrap.me,false);
  assert.equal((await community(alice,'message','POST',newMessage)).status,201);
  assert.equal((await community(alice,'message','POST',newMessage)).status,200,'Retry is idempotent');
  assert.equal((await community(bob,'message','POST',newMessage)).status,409,'Cannot take another sender’s ID');
  const feed=(await community(bob,'messages','GET',undefined,'&room=hearth')).data;
  assert.equal(feed.messages.length,1);assert.equal(feed.messages[0].author.id,alice);
  assert.equal((await community(bob,'messages','GET',undefined,'&room=poetry')).data.messages.length,0);
  assert.equal((await community(bob,'message','DELETE',{id:newMessage.id})).status,404,'Cannot delete another author’s message');
  const response={id:randomUUID(),room:'hearth',body:'Hello Alice',replyTo:newMessage.id};
  assert.equal((await community(bob,'message','POST',response)).status,201);
  assert.equal((await community(bob,'message','POST',{...response,id:randomUUID(),room:'poetry'})).status,400,'Replies cannot cross rooms');
  const replyFeed=(await community(alice,'messages','GET',undefined,'&room=hearth')).data.messages;
  assert.equal(replyFeed.find(item=>item.id===response.id).reply.body,'Hello from Alice');
  assert.equal((await community(bob,'report','POST',{id:newMessage.id,reason:'Privacy concern',note:'Please review'})).status,200);
  assert.equal((await community(bob,'reports')).status,403);
  assert.equal((await community(bob,'moderate','POST',{id:newMessage.id,decision:'remove'})).status,403);
  assert.equal((await community(moderator,'reports')).data.reports.length,1);
  assert.equal((await community(bob,'block','POST',{target:alice})).status,200);
  const blockedFeed=(await community(bob,'messages','GET',undefined,'&room=hearth')).data.messages;
  assert.equal(blockedFeed.some(item=>item.author.id===alice),false);assert.equal(blockedFeed[0].reply,null,'Reply excerpt cannot bypass blocking');
  assert.equal((await community(alice,'members')).data.members.some(person=>person.id===bob),false,'Block is respected in both directions');
  assert.equal((await community(bob,'bootstrap')).data.blocked[0].id,alice);
  assert.equal((await community(bob,'unblock','POST',{target:alice})).status,200);
  assert.equal((await community(moderator,'moderate','POST',{id:newMessage.id,decision:'remove'})).status,200);
  assert.equal((await community(bob,'messages','GET',undefined,'&room=hearth')).data.messages.find(item=>item.id===newMessage.id).body,'');
  assert.equal((await community(bob,'message','DELETE',{id:response.id})).status,200);
  const pageRows=Array.from({length:55},(_,i)=>({_id:randomUUID(),room:'small-joys',authorId:alice,body:'Page '+i,createdAt:new Date('2026-10-09T10:00:00Z'),deleted:false}));
  for(const row of pageRows)await db.collection('community_messages').insertOne(row);
  const first=(await community(bob,'messages','GET',undefined,'&room=small-joys')).data;
  const second=(await community(bob,'messages','GET',undefined,'&room=small-joys&before='+encodeURIComponent(first.nextCursor))).data;
  assert.equal(first.messages.length,50);assert.equal(second.messages.length,5);assert.equal(new Set([...first.messages,...second.messages].map(item=>item.id)).size,55,'Equal timestamp cursor does not duplicate or lose messages');
  assert.equal((await community(bob,'messages','GET',undefined,'&room=hearth&before=bad')).status,400);
  const window=Math.floor(Date.now()/60000);
  await db.collection('community_rate_limits').updateOne({_id:`${alice}:${window}`},{$set:{count:30}},{upsert:true});
  assert.equal((await community(alice,'message','POST',{...newMessage,id:randomUUID()})).status,429);
});

test('validation rejects operator injection and bounds profile/message content',()=>{
  assert.throws(()=>cleanProfile({alias:{$ne:''},bio:'',interests:[],agreed:true}));
  assert.throws(()=>cleanMessage({id:randomUUID(),room:{$ne:''},body:'hello'}));
  assert.throws(()=>cleanMessage({id:randomUUID(),room:'hearth',body:'x'.repeat(2001)}));
  assert.throws(()=>cleanProfile({alias:'Name',bio:'',interests:[],agreed:false}));
  assert.throws(()=>decodeCursor('2026-10-09T10:00:00Z|'+randomUUID()));
  assert.deepEqual(Object.keys(publicMember({_id:alice,alias:'A',bio:'',interests:[],email:'secret@example.test',history:'private'})).sort(),['alias','bio','id','interests','joinedAt']);
});
