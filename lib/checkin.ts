export const moodLabels = ['Heavy', 'Unsettled', 'In-between', 'At ease', 'Radiant'];
export type CheckIn = {
 id:string; date:string; mood:number|null; feelings:string[]; energy:string; sleep:string;
 stress:string; focus:string; selfTalk:string; motivation:string; connection:string;
 body:string; concern:string; need:string; safety:string; reflection:string;
};
export type Intention = {text:string; reason:string};
export function makeIntentions(check:Partial<CheckIn>|undefined):Intention[]{
 if(!check)return [{text:'Take a moment to check in',reason:'Begin with how today feels.'},{text:'Find a little stillness',reason:'Make room for a pause.'},{text:'Reach toward someone you love',reason:'A small connection can matter.'}];
 if(check.safety==='I’m not sure'||check.safety==='I need help staying safe')return [{text:'Open Find support and contact a trusted person',reason:'You shared that you may need help staying safe.'},{text:'Use emergency help if you cannot stay safe',reason:'This app cannot monitor or respond to an emergency.'}];
 const items:Intention[]=[];
 const add=(text:string,reason:string)=>items.push({text,reason});
 if(check.energy==='High'&&check.sleep==='Very little sleep')add('Protect time for rest and consider professional advice if this is unusual for you','You reported high energy with very little sleep.');
 if(check.stress==='Overwhelming'||check.stress==='High')add('Set one nonessential task aside and take a grounding pause',`You described your stress as ${check.stress.toLowerCase()}.`);
 if(check.selfTalk==='Very critical'||check.selfTalk==='Somewhat critical'||check.concern==='Low self-esteem')add('Write one kind, specific sentence about an effort you made','Your check-in pointed toward a need for kinder self-talk.');
 if(check.connection==='Isolated'||check.connection==='Distant'||check.need==='Connection')add('Invite someone safe to a short, low-pressure conversation','You shared a wish for more connection.');
 if(check.energy==='Low'||check.sleep==='Very little sleep'||check.need==='Rest')add('Make room for a meal, water, and a quiet break','Your answers suggest you would welcome rest or replenishment.');
 if(check.body==='Tense'||check.body==='Restless')add('Try a comfortable stretch or notice the support beneath your feet','You noticed tension or restlessness in your body.');
 if(check.motivation==='Hard to begin'||check.focus==='Scattered'||check.concern==='Avoidance')add('Choose a two-minute beginning, then decide whether to continue','You reported that starting or concentrating feels difficult.');
 if(check.concern==='Long-distance love')add('Agree on one small shared ritual with your loved one','You chose long-distance love as your focus.');
 if(check.mood===4||check.need==='Room to celebrate'||check.feelings?.includes('Proud')||check.feelings?.includes('Excited'))add('Enjoy one good thing, thank someone, and leave room for rest','You shared joy, pride, or a wish to celebrate.');
 if(check.concern==='Overthinking'||check.focus==='Racing thoughts')add('Write the repeating thought, then choose one thing within your control','You described overthinking or racing thoughts.');
 if(check.need==='Space to express myself')add('Give one feeling a few honest lines in your scrapbook','You asked for space to express yourself.');
 if(check.concern==='Low mood & depression')add('Consider reaching out to a qualified professional if low mood persists or affects daily life','You chose low mood as something taking up space.');
 if(!items.length){add('Choose one small action that feels kind today','A flexible starting point from the answers you chose to share.');add('Find words to sit with in Inspiria','Poetry can be a space for reflection, without anything to achieve.');}
 return items.slice(0,4);
}
