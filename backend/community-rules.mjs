export const COMMUNITY_ROOMS = [
  {id:'hearth',name:'By the hearth',caption:'An ordinary hello can be a beginning.',prompt:'What has your day felt like?',icon:'hearth'},
  {id:'poetry',name:'The poetry table',caption:'Words, books, and things that moved you.',prompt:'Share a line of your own, or a book you love.',icon:'poetry'},
  {id:'small-joys',name:'Small joys',caption:'A little good is still good.',prompt:'What is one small thing you want to celebrate?',icon:'joy'},
  {id:'quiet-company',name:'Quiet company',caption:'For slower days and gentle conversation.',prompt:'Would you like company, a listening ear, or a distraction?',icon:'quiet'},
];
export const REPORT_REASONS=['Harassment or hate','Spam or solicitation','Unsafe advice','Privacy concern','Other'];
export const actorIdValid = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
export const messageIdValid = value => typeof value==='string' && /^[a-f0-9-]{36}$/.test(value);
export const roomValid = value => COMMUNITY_ROOMS.some(room=>room.id===value);
export class RequestError extends Error {constructor(status,message){super(message);this.status=status;}}
export function boundedText(value,max,min=0){
  if(typeof value!=='string')throw new RequestError(400,'Please enter text.');
  const text=value.trim();
  if(text.length<min||text.length>max)throw new RequestError(400,`Use between ${min} and ${max} characters.`);
  return text;
}
export function cleanProfile(body){
  if(body.agreed!==true)throw new RequestError(400,'Please agree to the community guidelines.');
  if(!Array.isArray(body.interests)||body.interests.length>5)throw new RequestError(400,'Choose up to five interests.');
  return {alias:boundedText(body.alias,40,2),bio:boundedText(body.bio,280),interests:[...new Set(body.interests.map(v=>boundedText(v,24,1)))]};
}
export function cleanMessage(body){
  if(!roomValid(body.room)||!messageIdValid(body.id))throw new RequestError(400,'Invalid room or message.');
  if(body.replyTo!=null&&!messageIdValid(body.replyTo))throw new RequestError(400,'Invalid reply.');
  return {id:body.id,room:body.room,body:boundedText(body.body,2000,1),replyTo:body.replyTo||null};
}
export function decodeCursor(value){
  if(!value)return null;
  const [date,id,...rest]=value.split('|');
  if(rest.length||!messageIdValid(id)||!date||!Number.isFinite(Date.parse(date))||new Date(date).toISOString()!==date)throw new RequestError(400,'Invalid page cursor.');
  return {createdAt:new Date(date),id};
}
export function publicMember(member){return {id:member._id,alias:member.alias,bio:member.bio,interests:member.interests,joinedAt:member.joinedAt};}
