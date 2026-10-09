'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {BookOpen,Flame,Flower2,Leaf,MessageCircle,RefreshCw,Reply,Search,Send,ShieldCheck,Users,X,Flag,Trash2,UserRound,LockKeyhole} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {COMMUNITY_ROOMS,REPORT_REASONS} from '@/backend/community-rules.mjs';
import './community.css';

type Member={id:string;alias:string;bio:string;interests:string[];joinedAt?:string};
type Message={id:string;room:string;author:Member;body:string;deleted:boolean;createdAt:string;reply:{id:string;alias:string;body:string}|null};
type Bootstrap={me:Member|null;memberCount:number;blocked:Member[];canModerate:boolean};
type Report={_id:string;messageId:string;message:string;reason:string;note:string;room:string};
type ApiResults={bootstrap:Bootstrap;messages:{messages:Message[];nextCursor:string|null};members:{members:Member[];nextCursor:string|null};reports:{reports:Report[]};profile:{me:Member};message:{id?:string;sent?:boolean;deleted?:boolean};block:{saved:boolean};unblock:{saved:boolean};report:{reported:boolean};moderate:{reviewed:boolean}};
const interestOptions=['Poetry','Books','Music','Nature','Art','Mindfulness','Student life','Writing','Small joys','Slow living'];
const roomIcons={hearth:Flame,poetry:BookOpen,joy:Flower2,quiet:Leaf};
class CommunityError extends Error {constructor(message:string,public code:string){super(message);}}
async function api<K extends keyof ApiResults>(action:K,options:{query?:Record<string,string>;body?:unknown;method?:string;signal?:AbortSignal}={}){
  const query=new URLSearchParams({action,...options.query});
  const response=await fetch('/api/community?'+query,{method:options.method||'GET',headers:options.body?{'Content-Type':'application/json'}:undefined,body:options.body?JSON.stringify(options.body):undefined,signal:options.signal,cache:'no-store'});
  const data=await response.json() as ApiResults[K]&{error?:string;code?:string};
  if(!response.ok)throw new CommunityError(data.error||'Could not reach the conversation.',data.code||'unavailable');
  return data;
}
function mergedMessages(current:Message[],incoming:Message[]){
  const byId=new Map(current.map(message=>[message.id,message]));
  for(const message of incoming)byId.set(message.id,message);
  return [...byId.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
export default function Community({onSupport}:{onSupport:()=>void}){
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'|'sign_in'>('loading');
  const [boot,setBoot]=useState<Bootstrap>({me:null,memberCount:0,blocked:[],canModerate:false});
  const [room,setRoom]=useState('hearth'),[messages,setMessages]=useState<Message[]>([]),[cursor,setCursor]=useState<string|null>(null);
  const [loading,setLoading]=useState(false),[olderLoading,setOlderLoading]=useState(false),[refresh,setRefresh]=useState(0);
  const [error,setError]=useState(''),[feedError,setFeedError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [drafts,setDrafts]=useState<Record<string,string>>({}),[reply,setReply]=useState<Message|null>(null);
  const [dialog,setDialog]=useState<'profile'|'guidelines'|'members'|'member'|'report'|'delete'|'moderation'|null>(null);
  const [member,setMember]=useState<Member|null>(null),[target,setTarget]=useState<Message|null>(null);
  const [alias,setAlias]=useState(''),[bio,setBio]=useState(''),[interests,setInterests]=useState<string[]>([]),[agreed,setAgreed]=useState(false);
  const [memberQuery,setMemberQuery]=useState(''),[members,setMembers]=useState<Member[]>([]),[memberCursor,setMemberCursor]=useState<string|null>(null),[directoryLoading,setDirectoryLoading]=useState(false);
  const [reason,setReason]=useState(REPORT_REASONS[0]),[reportNote,setReportNote]=useState(''),[reports,setReports]=useState<Report[]>([]);
  const feed=useRef<HTMLDivElement>(null),composer=useRef<HTMLTextAreaElement>(null),followLatest=useRef(true);
  const activeRoom=useRef(room),directoryVersion=useRef(0),sendAttempt=useRef<{signature:string;id:string}|null>(null);
  const selected=COMMUNITY_ROOMS.find(value=>value.id===room)!;
  const draft=drafts[room]||'';

  const loadBootstrap=useCallback(async(signal?:AbortSignal)=>{
    try{const data=await api('bootstrap',{signal});setBoot(data);setStatus('ready');setError('');}
    catch(caught){if(signal?.aborted)return;const err=caught as CommunityError;setStatus(err.code==='sign_in'?'sign_in':'unavailable');setError(err.message||'The community could not be reached.');}
  },[]);
  useEffect(()=>{const controller=new AbortController();void loadBootstrap(controller.signal);return()=>controller.abort();},[loadBootstrap]);
  useEffect(()=>{activeRoom.current=room;setReply(null);setMessages([]);setCursor(null);followLatest.current=true;
    if(status!=='ready')return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;let first=true;
    setLoading(true);
    async function poll(){
      try{
        if(!first&&document.hidden)return;
        const data=await api('messages',{query:{room},signal:controller.signal});
        if(controller.signal.aborted)return;
        setMessages(previous=>mergedMessages(previous,data.messages));
        if(first)setCursor(data.nextCursor);first=false;setFeedError('');
      }catch(caught){if(!controller.signal.aborted)setFeedError((caught as Error).message||'Updates paused. Try refreshing.');}
      finally{if(!controller.signal.aborted){setLoading(false);timer=setTimeout(poll,8000);}}
    }
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[room,status,refresh]);
  useEffect(()=>{if(followLatest.current&&feed.current)feed.current.scrollTop=feed.current.scrollHeight;},[messages]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    if(dialog!=='members'||status!=='ready')return;
    const version=++directoryVersion.current,controller=new AbortController();
    setDirectoryLoading(true);setMembers([]);setMemberCursor(null);
    const timer=setTimeout(async()=>{try{const data=await api('members',{query:{q:memberQuery},signal:controller.signal});if(version===directoryVersion.current){setMembers(data.members);setMemberCursor(data.nextCursor);}}catch(caught){if(!controller.signal.aborted)setNotice((caught as Error).message);}finally{if(!controller.signal.aborted)setDirectoryLoading(false);}},200);
    return()=>{controller.abort();clearTimeout(timer);directoryVersion.current++;};
  },[dialog,memberQuery,status]);

  async function moreMembers(){const version=directoryVersion.current;setDirectoryLoading(true);try{const data=await api('members',{query:{q:memberQuery,after:memberCursor!}});if(version===directoryVersion.current){setMembers(previous=>[...previous,...data.members]);setMemberCursor(data.nextCursor);}}catch(caught){setNotice((caught as Error).message);}finally{setDirectoryLoading(false);}}
  async function older(){if(!cursor||olderLoading)return;const requestedRoom=room;setOlderLoading(true);followLatest.current=false;
    try{const data=await api('messages',{query:{room,before:cursor}});if(activeRoom.current!==requestedRoom)return;const height=feed.current?.scrollHeight||0;setMessages(previous=>mergedMessages(previous,data.messages));setCursor(data.nextCursor);requestAnimationFrame(()=>{if(feed.current&&activeRoom.current===requestedRoom)feed.current.scrollTop+=feed.current.scrollHeight-height;});}
    catch(caught){setNotice((caught as Error).message);}finally{setOlderLoading(false);}
  }
  function editProfile(){setAlias(boot.me?.alias||'');setBio(boot.me?.bio||'');setInterests(boot.me?.interests||[]);setAgreed(Boolean(boot.me));setDialog('profile');}
  async function mutate<K extends keyof ApiResults>(action:K,body:unknown,method='POST'){
    setBusy(true);try{return await api(action,{method,body});}finally{setBusy(false);}
  }
  async function saveProfile(event:FormEvent){event.preventDefault();try{const data=await mutate('profile',{alias,bio,interests,agreed});setBoot(previous=>({...previous,me:data.me}));setDialog(null);setNotice('Your community profile is ready.');await loadBootstrap();}catch(caught){setNotice((caught as Error).message);}}
  async function send(event:FormEvent){event.preventDefault();if(!draft.trim()||busy||!boot.me)return;
    const body=draft.trim(),signature=JSON.stringify([room,body,reply?.id]);
    if(sendAttempt.current?.signature!==signature)sendAttempt.current={signature,id:crypto.randomUUID()};
    try{await mutate('message',{id:sendAttempt.current.id,room,body,replyTo:reply?.id||null});sendAttempt.current=null;setDrafts(previous=>({...previous,[room]:''}));setReply(null);followLatest.current=true;setRefresh(value=>value+1);setNotice('Your message was sent.');}
    catch(caught){setNotice((caught as Error).message);}
  }
  async function block(person:Member,unblock=false){try{await mutate(unblock?'unblock':'block',{target:person.id});await loadBootstrap();setRefresh(value=>value+1);if(!unblock)setDialog(null);setNotice(unblock?'You can see this person again.':'This person’s messages and profile are now hidden from you.');}catch(caught){setNotice((caught as Error).message);}}
  async function remove(){if(!target)return;try{await mutate('message',{id:target.id},'DELETE');setDialog(null);setRefresh(value=>value+1);setNotice('Your message was removed.');}catch(caught){setNotice((caught as Error).message);}}
  async function report(event:FormEvent){event.preventDefault();if(!target)return;try{await mutate('report',{id:target.id,reason,note:reportNote});setDialog(null);setNotice('Report saved for moderation. Reports are not monitored live.');}catch(caught){setNotice((caught as Error).message);}}
  async function moderation(){setDialog('moderation');setReports([]);setDirectoryLoading(true);try{const data=await api('reports');setReports(data.reports);}catch(caught){setNotice((caught as Error).message);}finally{setDirectoryLoading(false);}}
  async function review(id:string,decision:string){try{await mutate('moderate',{id,decision});setReports(previous=>previous.filter(item=>item.messageId!==id));setRefresh(value=>value+1);setNotice('Report reviewed.');}catch(caught){setNotice((caught as Error).message);}}
  const dialogTitles={profile:boot.me?'Your community profile':'A name for this little corner',guidelines:'A little care for each other',members:'Meet the people here',member:member?.alias||'Community member',report:'Report this message',delete:'Remove your message?',moderation:'The moderation desk'};

  return <section className="community" aria-label="Community space">
    <div className="community-heading"><div><span className="eyebrow">THE COMMON ROOM</span><h1>A little less alone.</h1><p>Meet over a thought, a poem, or an ordinary day.</p></div><button className="community-secondary" onClick={()=>setDialog('guidelines')}><ShieldCheck size={17}/>Our shared care</button></div>
    <div className="community-topline"><span><Users size={17}/>{status==='ready'?`${boot.memberCount} ${boot.memberCount===1?'member':'members'}`:status==='loading'?'Opening the door…':'Community opening soon'}</span><div><button disabled={status!=='ready'} onClick={()=>setDialog('members')}>Meet people</button><button disabled={status!=='ready'} onClick={editProfile}>{boot.me?'My community profile':'Introduce yourself'}</button>{boot.canModerate&&<button onClick={moderation}>Moderation</button>}</div></div>
    {status==='unavailable'&&<div className="community-connection" role="status"><LockKeyhole size={20}/><div><strong>The door is being prepared.</strong><p>{error} You can explore the rooms below.</p></div><button onClick={()=>{setStatus('loading');void loadBootstrap();}}><RefreshCw size={16}/>Check again</button></div>}
    {status==='sign_in'&&<div className="community-connection"><Users size={22}/><p>Sign in to meet people and join a conversation.</p><a className="community-primary" href="/signin-with-chatgpt?return_to=%2F%3Fspace%3Dcommunity" target="_top">Sign in with ChatGPT</a></div>}
    <div className="community-layout">
      <aside className="community-rooms" aria-label="Conversation rooms"><span className="community-label">FIND YOUR TABLE</span>{COMMUNITY_ROOMS.map(item=>{const Icon=roomIcons[item.icon as keyof typeof roomIcons];return <button key={item.id} className={room===item.id?'selected':''} disabled={busy} onClick={()=>setRoom(item.id)} aria-pressed={room===item.id}><Icon size={22}/><span><strong>{item.name}</strong><small>{item.caption}</small></span></button>;})}<div className="community-aside-note"><Leaf size={23}/><p>Listening is a way of belonging, too.</p><small>Stay for a sentence.<br/>Stay for a while.</small></div></aside>
      <div className="community-conversation">
        <div className="community-room-heading"><div><h2>{selected.name}</h2><p>{selected.caption}</p></div><button aria-label="Refresh this conversation" disabled={status!=='ready'||loading||busy} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={18}/></button></div>
        {feedError&&<p className="community-feed-error" role="alert">{feedError} <button onClick={()=>setRefresh(value=>value+1)}>Retry</button></p>}
        <div className="community-feed" ref={feed} aria-label={`${selected.name} messages`} aria-busy={loading} onScroll={()=>{const element=feed.current;if(element)followLatest.current=element.scrollHeight-element.scrollTop-element.clientHeight<70;}}>
          {cursor&&<button className="community-older" onClick={older} disabled={olderLoading}>{olderLoading?'Opening earlier words…':'Earlier conversation'}</button>}
          {loading&&!messages.length?<div className="community-room-empty"><MessageCircle size={30}/><p>Opening the conversation…</p></div>:!messages.length?<div className="community-room-empty"><MessageCircle size={35}/><h3>{status==='ready'?'A conversation starts with one hello.':'A place is waiting for you.'}</h3><p>{selected.prompt}</p><small>{status==='ready'?'Be the first to leave a thought at this table.':'Shared conversations will appear here once the community opens.'}</small></div>:messages.map(message=><article className={`community-message${message.author.id===boot.me?.id?' own':''}`} key={message.id}>
            <button className="community-avatar" aria-label={`View ${message.author.alias}’s profile`} onClick={()=>{setMember(message.author);setDialog('member');}}>{message.author.alias[0]?.toUpperCase()||'P'}</button>
            <div className="community-message-copy"><div className="community-message-meta"><button onClick={()=>{setMember(message.author);setDialog('member');}}>{message.author.alias}{message.author.id===boot.me?.id&&<small> · you</small>}</button><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{new Date(message.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>
              {!message.deleted&&message.reply&&<blockquote><strong>Replying to {message.reply.alias}</strong><span>{message.reply.body}</span></blockquote>}
              <p className={message.deleted?'removed':''}>{message.deleted?'This message has been removed.':message.body}</p>
              {!message.deleted&&boot.me&&<div className="community-message-actions"><button disabled={busy} onClick={()=>{setReply(message);composer.current?.focus();}}><Reply size={14}/>Reply</button>{message.author.id===boot.me.id?<button onClick={()=>{setTarget(message);setDialog('delete');}}><Trash2 size={13}/>Remove</button>:<button onClick={()=>{setTarget(message);setReason(REPORT_REASONS[0]);setReportNote('');setDialog('report');}}><Flag size={13}/>Report</button>}</div>}
            </div></article>)}
        </div>
        <form className="community-composer" onSubmit={send}>
          {reply&&<div className="community-replying"><span>Replying to <strong>{reply.author.alias}</strong></span><button type="button" aria-label="Cancel reply" disabled={busy} onClick={()=>setReply(null)}><X size={16}/></button></div>}
          {status==='ready'&&!boot.me?<div className="community-join"><p>Choose a name to join the conversation. A pen name is welcome.</p><button type="button" className="community-primary" onClick={editProfile}>Introduce yourself</button></div>:<><label className="sr-only" htmlFor="community-message">Your message to {selected.name}</label><textarea ref={composer} id="community-message" maxLength={2000} rows={3} disabled={status!=='ready'||busy} placeholder={status==='ready'?'Leave a kind word at the table…':'The conversation will open here soon.'} value={draft} onChange={event=>setDrafts(previous=>({...previous,[room]:event.target.value}))}/><div className="community-compose-bottom"><span>{draft.length}/2,000 · Visible to community members</span><button type="submit" className="community-primary" disabled={status!=='ready'||!boot.me||!draft.trim()||busy}><Send size={16}/>{busy?'Sending…':'Send a little hello'}</button></div></>}
        </form>
      </div>
    </div>
    <div className="community-footnote"><LockKeyhole size={16}/><p>Your journal and check-ins stay private. Only the profile and messages you share here are visible to others.</p></div>
    <p className="community-support">Peer conversation, not professional care or live support. <button onClick={onSupport}>Find support</button></p>
    {notice&&<div className="community-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <Dialog open={Boolean(dialog)} onOpenChange={open=>{if(!open&&!busy)setDialog(null);}}><DialogContent className="community-dialog"><DialogTitle>{dialog?dialogTitles[dialog]:''}</DialogTitle><DialogDescription>{dialog==='profile'?'Only these details appear in the community. A pen name is welcome.':dialog==='members'?'Find someone through a shared interest.':dialog==='member'?'A profile shared by this community member.':dialog==='report'?'Reports are saved for moderation, not monitored live.':dialog==='delete'?'The text will be removed from the room. Existing moderation reports may retain a copy.':dialog==='moderation'?'Review reported messages. This view is restricted to moderators.':'Help this space feel welcoming for everyone.'}</DialogDescription>
      {dialog==='guidelines'&&<div className="community-guidelines"><p>Bring curiosity and a little kindness.</p><ul><li>Speak from your own experience. Ask before offering advice.</li><li>No harassment, hate, pressure, diagnoses, or promotions.</li><li>Keep personal contact details and other people’s private stories off the table.</li><li>You can leave, block someone, or report a message whenever you need to.</li><li>This space is not monitored live and cannot provide emergency help.</li></ul><button className="community-secondary" onClick={()=>{setDialog(null);onSupport();}}>Find personal support</button></div>}
      {dialog==='profile'&&<form onSubmit={saveProfile} className="community-profile-form"><label htmlFor="community-alias">Name or pen name<input id="community-alias" required minLength={2} maxLength={40} value={alias} onChange={event=>setAlias(event.target.value)}/></label><label htmlFor="community-bio">A little about you <small>(optional)</small><textarea id="community-bio" maxLength={280} value={bio} onChange={event=>setBio(event.target.value)} placeholder="The books, small joys, or conversations you enjoy…"/></label><fieldset><legend>Things you enjoy <small>· choose up to five</small></legend><div className="community-interest-options">{interestOptions.map(interest=><button type="button" key={interest} aria-pressed={interests.includes(interest)} disabled={!interests.includes(interest)&&interests.length>=5} onClick={()=>setInterests(previous=>previous.includes(interest)?previous.filter(item=>item!==interest):[...previous,interest])}>{interest}</button>)}</div></fieldset><label className="community-consent"><input type="checkbox" checked={agreed} onChange={event=>setAgreed(event.target.checked)} required/>I’ll follow the shared care guidelines and understand that my community profile and messages are visible to other members.</label><button className="community-primary" disabled={busy||alias.trim().length<2||!agreed}>{busy?'Saving…':'Save my community profile'}</button>{boot.blocked.length>0&&<div className="community-blocked"><h3>People you’ve blocked</h3>{boot.blocked.map(person=><div key={person.id}><span>{person.alias}</span><button type="button" disabled={busy} onClick={()=>block(person,true)}>Unblock</button></div>)}</div>}</form>}
      {dialog==='members'&&<><div className="community-directory-search"><Search size={18}/><input aria-label="Find members by name or interest" maxLength={80} placeholder="A name, poetry, music…" value={memberQuery} onChange={event=>setMemberQuery(event.target.value)}/></div><div className="community-directory">{members.map(person=><button className="community-member-card" key={person.id} onClick={()=>{setMember(person);setDialog('member');}}><span className="community-avatar">{person.alias[0].toUpperCase()}</span><span><strong>{person.alias}</strong><small>{person.bio||'Here for a little company.'}</small><span>{person.interests.join(' · ')}</span></span></button>)}{directoryLoading&&<p>Finding people…</p>}{!directoryLoading&&!members.length&&<p>{memberQuery?'No one matches those words yet.':'Your community is just beginning.'}</p>}{memberCursor&&<button className="community-secondary" disabled={directoryLoading} onClick={moreMembers}>Meet more people</button>}</div></>}
      {dialog==='member'&&member&&<div className="community-member-profile"><span className="community-avatar">{member.alias[0]?.toUpperCase()}</span><p>{member.bio||'Here for a little company.'}</p><div className="community-interest-options">{member.interests.map(interest=><span key={interest}>{interest}</span>)}</div>{member.id===boot.me?.id?<button className="community-secondary" onClick={editProfile}>Edit my profile</button>:<><p>Meet in a conversation room and say hello when it feels right.</p><button className="community-primary" onClick={()=>{setDialog(null);composer.current?.focus();}}>Back to the conversation</button>{boot.me&&<button className="community-block-button" disabled={busy} onClick={()=>block(member)}>Block this person</button>}</>}</div>}
      {dialog==='report'&&<form onSubmit={report} className="community-profile-form"><label>Reason<select value={reason} onChange={event=>setReason(event.target.value)}>{REPORT_REASONS.map(value=><option key={value}>{value}</option>)}</select></label><label>Anything else? <small>(optional)</small><textarea maxLength={300} value={reportNote} onChange={event=>setReportNote(event.target.value)}/></label><button className="community-primary" disabled={busy}>{busy?'Saving…':'Submit report'}</button>{target&&<button type="button" className="community-block-button" disabled={busy} onClick={()=>block(target.author)}>Block this person instead</button>}</form>}
      {dialog==='delete'&&<div className="community-delete-actions"><button className="community-secondary" disabled={busy} onClick={()=>setDialog(null)}>Keep it</button><button className="community-primary" disabled={busy} onClick={remove}>Remove message</button></div>}
      {dialog==='moderation'&&<div className="community-report-list">{directoryLoading?<p>Opening reports…</p>:reports.length?reports.map(item=><article key={item._id}><strong>{item.reason} · {item.room}</strong><blockquote>{item.message}</blockquote>{item.note&&<p>{item.note}</p>}<div><button className="community-primary" disabled={busy} onClick={()=>review(item.messageId,'remove')}>Remove message</button><button className="community-secondary" disabled={busy} onClick={()=>review(item.messageId,'dismiss')}>Dismiss report</button></div></article>):<p>No open reports.</p>}</div>}
    </DialogContent></Dialog>
  </section>;
}
