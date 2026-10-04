import anthology from './anthology.json';
export type Reading = {id:string;type:'Poem'|'Quote';title:string;author:string;body:string;tags:string[];work:string;source?:string;original?:boolean};
const originalAuthor='Poets & Perspectives';
const poems:[string,string,string[]][]=[
['The Unfinished Garden',`Nothing in the garden\nasks the rose to hurry.\nEven the empty patch\nis doing something with the rain.\n\nLeave a little room\nfor what has not arrived.`,['Patience','Nature','Hope']],
['A Chair by the Window',`Bring your tiredness.\nThere is a chair by the window\nand no one here\nis counting what you made.\n\nFor a while, let the light\nbe the only thing at work.`,['Rest','Self-kindness','Calm']],
['Across the Miles',`At your window, evening.\nAt mine, the kettle sings.\nBetween us, all these roads—\nand still, the ordinary miracle:\n\nyour voice\nin the room.`,['Love','Distance','Connection']],
['A Small Beginning',`The page does not demand\nthe whole story.\nA door only asks\nfor the turn of a handle.\n\nToday, let beginning\nbe small enough to hold.`,['Courage','Beginnings','Self-kindness']],
['Weather Report',`A cloud has come to stay\nabove the little house.\nI do not call the house a storm.\nI put the kettle on,\n\nand leave one window\nopen to the changing sky.`,['Calm','Perspective','Patience']],
['The Shared Table',`Bring the story\nthat would not fit in a message.\nBring the silence, too.\n\nWe will make a little room\nbetween the cups\nand call it company.`,['Belonging','Connection','Love']],
['For a Bright Day',`Let the good news\nsit beside you a while.\nYou need not turn it\ninto another mountain.\n\nThere is a kind of joy\nthat simply eats its breakfast\nin the sun.`,['Joy','Gratitude','Rest']],
['The Hand That Helped',`When the fruit is sweet,\nremember the hands\nthat carried water.\n\nLet your pride grow branches—\nplaces where another bird\nmight land.`,['Gratitude','Humility','Joy']],
['An Ordinary Lantern',`I cannot light the whole road.\nBut here is the next stone,\nthe edge of the path,\nyour hand against the gate.\n\nFor now,\nthis much light.`,['Hope','Courage','Calm']],
['A Letter to My Own Heart',`I have spoken to you\nas though you were late\nfor becoming someone else.\n\nToday I will learn your name\nas it is,\nand say it gently.`,['Self-kindness','Belonging','Perspective']],
['Things the River Keeps',`The river carries leaves\nwithout becoming a leaf.\nIt carries the sky\nwithout holding it still.\n\nBeside it, I practise\nloosening my hands.`,['Nature','Calm','Perspective']],
['After the Long Silence',`No grand speech.\nNo explanation polished smooth.\nJust: I thought of you.\nJust: Are you free?\n\nA bridge can begin\nwith a plank\nwide enough for one hello.`,['Connection','Courage','Beginnings']]
];
const originalQuotes:[string,string,string[]][]=[
['A quiet kind of progress','You can make room for tomorrow without asking today to disappear.',['Hope','Patience']],
['Enough for this moment','A pause does not erase the distance you have travelled.',['Rest','Self-kindness']],
['Keep the good','Joy does not need an audience to be worth keeping.',['Joy','Gratitude']],
['A softer voice','Try speaking to yourself as someone you hope will stay.',['Self-kindness','Love']],
['Room at the table','You do not have to become interesting enough to deserve company.',['Belonging','Connection']],
['One small opening','Curiosity can be a gentler beginning than certainty.',['Beginnings','Humility']]
];
export const readings:Reading[]=[
...poems.map(([title,body,tags],i)=>({id:`poem-${i+1}`,type:'Poem' as const,title,body,tags,author:originalAuthor,work:'An original poem for Inspiria',original:true})),
{id:'dickinson-hope',type:'Quote',title:'A feathered hope',author:'Emily Dickinson',body:'Hope is the thing with feathers',tags:['Hope','Courage'],work:'“Hope” · opening line',source:'https://www.gutenberg.org/files/12242/12242-h/12242-h.htm'},
{id:'keats-beauty',type:'Quote',title:'A joy for ever',author:'John Keats',body:'A thing of beauty is a joy for ever:',tags:['Nature','Joy','Gratitude'],work:'Endymion · Book I, opening line',source:'https://www.gutenberg.org/ebooks/24280'},
{id:'dickinson-possibility',type:'Quote',title:'A house of possibility',author:'Emily Dickinson',body:'I dwell in Possibility',tags:['Hope','Beginnings'],work:'I dwell in Possibility · opening line',source:'https://en.wikisource.org/wiki/Further_Poems_of_Emily_Dickinson/I_dwell_in_Possibility'},
{id:'austen-tenderness',type:'Quote',title:'Tenderness of heart',author:'Jane Austen',body:'There is no charm equal to tenderness of heart',tags:['Love','Self-kindness','Connection'],work:'Emma · Chapter 31',source:'https://austen.unl.edu/visualizations/emma/31'},
{id:'blake-world',type:'Quote',title:'A world in the small',author:'William Blake',body:'To see the world in a grain of sand,',tags:['Nature','Perspective','Gratitude'],work:'Auguries of Innocence · opening line, collected edition',source:'https://www.gutenberg.org/cache/epub/79363/pg79363-images.html'},
{id:'shakespeare-stage',type:'Quote',title:'Many parts to play',author:'William Shakespeare',body:'All the world’s a stage,',tags:['Perspective','Humility'],work:'As You Like It · Act II, Scene VII',source:'https://www.gutenberg.org/cache/epub/1523/pg1523-images.html'},
{id:'dickinson-heart',type:'Poem',title:'If I can stop one heart from breaking',author:'Emily Dickinson',body:'If I can stop one heart from breaking,\nI shall not live in vain;\nIf I can ease one life the aching,\nOr cool one pain,\nOr help one fainting robin\nUnto his nest again,\nI shall not live in vain.',tags:['Connection','Love','Nature'],work:'Poems · First Series, Life VI · early edited text',source:'https://www.gutenberg.org/files/12242/12242-h/12242-h.htm'},
{id:'dickinson-morning',type:'Poem',title:'Our share of night to bear',author:'Emily Dickinson',body:'Our share of night to bear,\nOur share of morning,\nOur blank in bliss to fill,\nOur blank in scorning.\nHere a star, and there a star,\nSome lose their way.\nHere a mist, and there a mist,\nAfterwards — day!',tags:['Hope','Patience','Perspective'],work:'Poems · First Series, Life II · early edited text',source:'https://www.gutenberg.org/files/12242/12242-h/12242-h.htm'},
...originalQuotes.map(([title,body,tags],i)=>({id:`reflection-${i+1}`,type:'Quote' as const,title,body,tags,author:originalAuthor,work:'An original reflection for Inspiria',original:true})),
...(anthology as Reading[])
];
export const inspiriaTags=Array.from(new Set(readings.flatMap(r=>r.tags))).sort();
export function filterReadings(query:string,type:string,tags:string[]){const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return readings.filter(r=>(type==='All'||r.type===type)&&tags.every(t=>r.tags.includes(t))&&words.every(w=>[r.title,r.author,r.body,r.work,...r.tags].join(' ').toLocaleLowerCase().includes(w)));}
export function scrapbookText(r:Reading){return `${r.body}\n\n— ${r.author}\n${r.work}${r.source?'\n'+r.source:''}`;}

export const INSPIRIA_PAGE_SIZE=50;
export function readingPage(items:Reading[],page:number){const pages=Math.max(1,Math.ceil(items.length/INSPIRIA_PAGE_SIZE));const current=Math.min(Math.max(0,page),pages-1);return {items:items.slice(current*INSPIRIA_PAGE_SIZE,(current+1)*INSPIRIA_PAGE_SIZE),page:current,pages,start:items.length?current*INSPIRIA_PAGE_SIZE+1:0,end:Math.min((current+1)*INSPIRIA_PAGE_SIZE,items.length)};}
