import {COMMUNITY_ROOMS,REPORT_REASONS,RequestError,actorIdValid,messageIdValid,roomValid,boundedText,cleanProfile,cleanMessage,decodeCursor,publicMember} from './community-rules.mjs';

export async function communityIndexes(db){
  await Promise.all([
    db.collection('community_messages').createIndex({room:1,createdAt:-1,_id:-1}),
    db.collection('community_members').createIndex({alias:1,_id:1}),
    db.collection('community_blocks').createIndex({target:1}),
    db.collection('community_reports').createIndex({status:1,createdAt:-1}),
    db.collection('community_rate_limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
  ]);
}

export async function communityRequest(db,userId,method,url,body,moderatorIds=[]){
  const members=db.collection('community_members'),messages=db.collection('community_messages');
  const blocks=db.collection('community_blocks'),reports=db.collection('community_reports');
  const moderator=moderatorIds.includes(userId);
  const action=url.searchParams.get('action')||'bootstrap';
  const me=await members.findOne({_id:userId});
  const relations=await blocks.find({$or:[{by:userId},{target:userId}]}).toArray();
  const hidden=[...new Set(relations.map(row=>row.by===userId?row.target:row.by))];
  const ownBlocks=relations.filter(row=>row.by===userId).map(row=>row.target);
  const result=(data,status=200)=>({status,data});
  const requireMember=()=>{if(!me)throw new RequestError(403,'Create your community profile before joining the conversation.');};

  if(method==='GET'&&action==='bootstrap'){
    const blockedMembers=ownBlocks.length?await members.find({_id:{$in:ownBlocks}}).toArray():[];
    return result({connected:true,me:me?publicMember(me):null,rooms:COMMUNITY_ROOMS,memberCount:await members.countDocuments({_id:{$nin:hidden}}),blocked:blockedMembers.map(publicMember),canModerate:moderator});
  }
  if(method==='GET'&&action==='members'){
    const query=boundedText(url.searchParams.get('q')||'',80);
    const after=url.searchParams.get('after');
    if(after&&!actorIdValid(after))throw new RequestError(400,'Invalid member cursor.');
    const filter={_id:{$nin:hidden,...(after?{$gt:after}:{})}};
    if(query){const safe=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=[{alias:{$regex:safe,$options:'i'}},{interests:{$regex:safe,$options:'i'}}];}
    const rows=await members.find(filter).sort({_id:1}).limit(31).toArray();
    const list=rows.slice(0,30);
    return result({members:list.map(publicMember),nextCursor:rows.length>30?list.at(-1)._id:null});
  }
  if(method==='GET'&&action==='messages'){
    const room=url.searchParams.get('room');if(!roomValid(room))throw new RequestError(400,'Choose a conversation room.');
    const cursor=decodeCursor(url.searchParams.get('before'));
    const filter={room,authorId:{$nin:hidden}};
    if(cursor)filter.$or=[{createdAt:{$lt:cursor.createdAt}},{createdAt:cursor.createdAt,_id:{$lt:cursor.id}}];
    const rows=await messages.find(filter).sort({createdAt:-1,_id:-1}).limit(51).toArray();
    const page=rows.slice(0,50),ids=[...new Set(page.map(row=>row.authorId))];
    const replyIds=page.filter(row=>row.replyTo&&!row.deleted).map(row=>row.replyTo);
    const replies=replyIds.length?await messages.find({_id:{$in:replyIds},room,deleted:{$ne:true},authorId:{$nin:hidden}}).toArray():[];
    const authors=await members.find({_id:{$in:[...ids,...replies.map(row=>row.authorId)]}}).toArray();
    const authorMap=new Map(authors.map(person=>[person._id,publicMember(person)]));
    return result({messages:page.reverse().map(row=>{
      const reply=replies.find(r=>r._id===row.replyTo);
      return {id:row._id,room:row.room,author:authorMap.get(row.authorId)||{id:row.authorId,alias:'Former member',bio:'',interests:[]},body:row.deleted?'':row.body,deleted:!!row.deleted,createdAt:row.createdAt,reply:reply?{id:reply._id,alias:authorMap.get(reply.authorId)?.alias||'Former member',body:reply.body.slice(0,140)}:null};
    }),nextCursor:rows.length>50?`${rows[49].createdAt.toISOString()}|${rows[49]._id}`:null});
  }
  if(method==='GET'&&action==='reports'){
    if(!moderator)throw new RequestError(403,'Moderator access required.');
    return result({reports:await reports.find({status:'open'}).sort({createdAt:-1}).limit(50).toArray()});
  }
  if(!['POST','DELETE'].includes(method))throw new RequestError(405,'Method not allowed.');
  if(!['profile','message','block','unblock','report','moderate'].includes(action))throw new RequestError(404,'Unknown community action.');

  // Atomic, database-backed limit; the TTL index only cleans old windows.
  const now=new Date(),windowId=Math.floor(now.getTime()/60000);
  const rate=await db.collection('community_rate_limits').findOneAndUpdate(
    {_id:`${userId}:${windowId}`},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(now.getTime()+120000)}},
    {upsert:true,returnDocument:'after',includeResultMetadata:false});
  if(rate.count>30)throw new RequestError(429,'A little pause, please. Try again in a minute.');

  if(method==='POST'&&action==='profile'){
    const profile=cleanProfile(body);
    await members.updateOne({_id:userId},{$set:{...profile,updatedAt:now},$setOnInsert:{joinedAt:now}},{upsert:true});
    return result({me:publicMember({_id:userId,...profile,joinedAt:me?.joinedAt||now})});
  }
  requireMember();
  if(method==='POST'&&action==='message'){
    const clean=cleanMessage(body);
    const existing=await messages.findOne({_id:clean.id});
    if(existing){if(existing.authorId!==userId||existing.room!==clean.room)throw new RequestError(409,'Please try sending this as a new message.');return result({id:existing._id,sent:true});}
    if(clean.replyTo&&!await messages.findOne({_id:clean.replyTo,room:clean.room,deleted:{$ne:true},authorId:{$nin:hidden}}))throw new RequestError(400,'That message is no longer available to reply to.');
    try{await messages.insertOne({_id:clean.id,room:clean.room,body:clean.body,replyTo:clean.replyTo,authorId:userId,createdAt:now,deleted:false});}
    catch(error){if(error.code!==11000)throw error;const duplicate=await messages.findOne({_id:clean.id,authorId:userId,room:clean.room});if(!duplicate)throw new RequestError(409,'Message conflict. Please try again.');}
    return result({id:clean.id,sent:true},201);
  }
  if(method==='DELETE'&&action==='message'){
    if(!messageIdValid(body.id))throw new RequestError(400,'Invalid message.');
    const changed=await messages.updateOne({_id:body.id,authorId:userId},{$set:{body:'',deleted:true,deletedAt:now}});
    if(!changed.matchedCount)throw new RequestError(404,'Your message could not be found.');
    return result({deleted:true});
  }
  if(method==='POST'&&(action==='block'||action==='unblock')){
    if(!actorIdValid(body.target)||body.target===userId)throw new RequestError(400,'Choose another member.');
    if(action==='unblock')await blocks.deleteOne({_id:`${userId}:${body.target}`});
    else {if(!await members.findOne({_id:body.target}))throw new RequestError(404,'Member not found.');await blocks.updateOne({_id:`${userId}:${body.target}`},{$set:{by:userId,target:body.target,createdAt:now}},{upsert:true});}
    return result({saved:true});
  }
  if(method==='POST'&&action==='report'){
    if(!messageIdValid(body.id)||!REPORT_REASONS.includes(body.reason))throw new RequestError(400,'Choose a message and a report reason.');
    const message=await messages.findOne({_id:body.id,deleted:{$ne:true},authorId:{$nin:[...hidden,userId]}});
    if(!message)throw new RequestError(404,'Message not found.');
    await reports.updateOne({_id:`${userId}:${message._id}`},{$setOnInsert:{by:userId,messageId:message._id,authorId:message.authorId,room:message.room,message:message.body,reason:body.reason,note:boundedText(body.note||'',300),createdAt:now,status:'open'}},{upsert:true});
    return result({reported:true});
  }
  if(method==='POST'&&action==='moderate'){
    if(!moderator)throw new RequestError(403,'Moderator access required.');
    if(!messageIdValid(body.id)||!['remove','dismiss'].includes(body.decision))throw new RequestError(400,'Invalid moderation action.');
    if(body.decision==='remove')await messages.updateOne({_id:body.id},{$set:{body:'',deleted:true,deletedAt:now}});
    await reports.updateMany({messageId:body.id,status:'open'},{$set:{status:body.decision,reviewedBy:userId,reviewedAt:now}});
    return result({reviewed:true});
  }
  throw new RequestError(405,'Method not allowed.');
}
