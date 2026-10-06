'use client';

import {useEffect, useRef, useState} from 'react';
import {BookOpen, CalendarDays, Feather, Library, Search} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {blankPlannerDay, formatPlannerDate, localDateKey, searchPlannerDays, shiftPlannerDate, validPlannerDate, type NoteSlot, type PlannerDay} from '@/lib/planner';
import './day-planner.css';

const stickySlots: NoteSlot[] = ['remember', 'care', 'later'];
const stickyHints: Record<NoteSlot, string> = {
  remember: 'A time, a person, a small thing to remember…',
  care: 'What would make today feel kinder?',
  later: 'Leave something here for another day…',
};

export default function DayPlanner({days, onWrite, ready, storage, onSavingPreferences}: {
  days: PlannerDay[];
  onWrite: (page: PlannerDay) => void;
  ready: boolean;
  storage: 'cloud' | 'device' | 'session';
  onSavingPreferences: () => void;
}) {
  const [date, setDate] = useState('');
  const [shelfOpen, setShelfOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [shelfDate, setShelfDate] = useState('');
  const paperRef = useRef<HTMLTextAreaElement>(null);
  const returnToPaper = useRef(false);

  useEffect(() => { const today = localDateKey(); setDate(today); setShelfDate(today); }, []);
  const page = days.find(day => day.date === date) ?? blankPlannerDay(date);
  const matches = searchPlannerDays(days, query);

  function write(patch: Partial<PlannerDay>) {
    if (!ready || !validPlannerDate(date)) return;
    onWrite({...page, ...patch, date, updatedAt: new Date().toISOString()});
  }
  function writeNote(slot: NoteSlot, field: 'title' | 'text', value: string) {
    write({notes: {...page.notes, [slot]: {...page.notes[slot], [field]: value}}});
  }
  function openPage(next: string, fromShelf = false) {
    if (!validPlannerDate(next)) return;
    setDate(next);
    if (fromShelf) {returnToPaper.current = true; setShelfOpen(false);}
  }

  return <section className="day-planner" aria-label="Day planner">
    <div className="planner-toolbar">
      <div><span className="planner-kicker">THE WRITING ROOM</span><h1>Leave a little room.</h1><p>Your day, in your own words.</p></div>
      <div className="planner-calendar">
        <label htmlFor="planner-date"><CalendarDays size={16}/> A page for</label>
        <div><button disabled={!date} onClick={() => openPage(shiftPlannerDate(date, -1))} aria-label="Previous day">Earlier</button>
          <input id="planner-date" type="date" value={date} min="1900-01-01" max="9999-12-31" onChange={event => openPage(event.target.value)}/>
          <button disabled={!date} onClick={() => openPage(shiftPlannerDate(date, 1))} aria-label="Next day">Later</button>
        </div>
        <button className="planner-today" onClick={() => openPage(localDateKey())}>Come back to today</button>
      </div>
    </div>

    <div className="planner-room">
      <img className="planner-room-art" src="/writing-room.png" width="1536" height="1024" alt="A first-person view of a dark study, with bookshelves and an old wooden desk lit by a brass lamp"/>
      <Dialog open={shelfOpen} onOpenChange={open => {setShelfOpen(open); if(open) setShelfDate(date || localDateKey());}}>
        <DialogTrigger asChild>
          <button className="planner-shelf" aria-label={`Open the shelf: ${days.length} day pages`}>
            <span className="planner-shelf-label"><Library size={19}/><span>The shelf<small>{days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'} tucked away` : 'A place for your days'}</small></span><span className="shelf-open-word">Open</span></span>
          </button>
        </DialogTrigger>
        <DialogContent className="planner-shelf-dialog" onCloseAutoFocus={event => {
          if(returnToPaper.current) {event.preventDefault(); returnToPaper.current = false; paperRef.current?.focus();}
        }}>
          <div className="planner-shelf-intro"><BookOpen size={25}/><span className="planner-kicker">PAPERS YOU HAVE KEPT</span></div>
          <DialogTitle className="planner-shelf-title">A shelf of ordinary days.</DialogTitle>
          <DialogDescription className="planner-shelf-description">Pick a page to bring it back to the desk. You can keep writing on any day.</DialogDescription>
          <div className="planner-shelf-search"><Search size={18}/><input aria-label="Search your day pages" placeholder="Find a date, a thought, a little note…" value={query} onChange={event => setQuery(event.target.value)}/></div>
          <form className="planner-open-date" onSubmit={event => {event.preventDefault(); openPage(shelfDate, true);}}>
            <label htmlFor="shelf-date">Open or start a dated page<input id="shelf-date" type="date" min="1900-01-01" max="9999-12-31" value={shelfDate} onChange={event => setShelfDate(event.target.value)} required/></label>
            <button type="submit" disabled={!validPlannerDate(shelfDate)}>Bring to the desk</button>
          </form>
          <div className="planner-shelf-pages" aria-label="Your day pages">
            {matches.map(day => <button key={day.date} className="planner-kept-page" onClick={() => openPage(day.date, true)}>
              <span className="planner-book-date"><strong>{day.date.slice(8)}</strong><span>{new Date(day.date + 'T12:00:00').toLocaleDateString('en-IN', {month: 'short'})}</span></span>
              <span className="planner-kept-copy"><small>{formatPlannerDate(day.date, true)}{day.date === date ? ' · on your desk' : ''}</small><strong>{day.title.trim() || 'An ordinary little day'}</strong><span>{day.body.trim() || Object.values(day.notes).find(note => note.text.trim())?.text || 'A page with room to grow.'}</span></span>
            </button>)}
            {!matches.length && <div className="planner-shelf-empty"><Feather size={27}/><p>{days.length ? 'No pages match those words.' : 'Your shelf is waiting for its first day.'}</p><small>{days.length ? 'Try a date, a word from your paper, or a sticky note.' : 'Write on the desk paper or a sticky note. Your day will appear here.'}</small></div>}
          </div>
        </DialogContent>
      </Dialog>

      <div className="planner-desk" aria-busy={!ready}>
        <article className="planner-paper">
          <div className="planner-paper-top"><Feather size={18}/><span>{date ? formatPlannerDate(date) : 'Opening your desk…'}</span></div>
          <label className="sr-only" htmlFor="planner-page-title">Title for this day</label>
          <input id="planner-page-title" className="planner-paper-title" maxLength={100} placeholder="A shape for today" value={page.title} disabled={!ready || !date} onChange={event => write({title: event.target.value})}/>
          <label htmlFor="planner-page-body" className="planner-paper-invitation">What would you like to make room for?</label>
          <textarea ref={paperRef} id="planner-page-body" className="planner-paper-body" maxLength={6000} spellCheck placeholder={'Morning, slowly.\n\nSomething I would like to give my time to…\n\nA little space for whatever comes.'} value={page.body} disabled={!ready || !date} onChange={event => write({body: event.target.value})}/>
          <div className="planner-paper-bottom"><span>A plan can change with you.</span><small>{page.body.length.toLocaleString()} / 6,000</small></div>
        </article>
        <div className="planner-stickies" aria-label="Little notes for this day">
          {stickySlots.map(slot => <article className={`planner-sticky planner-sticky-${slot}`} key={slot}>
            <label className="sr-only" htmlFor={`sticky-title-${slot}`}>Title for the {slot} sticky note</label>
            <input id={`sticky-title-${slot}`} maxLength={60} value={page.notes[slot].title} disabled={!ready || !date} onChange={event => writeNote(slot, 'title', event.target.value)}/>
            <label className="sr-only" htmlFor={`sticky-text-${slot}`}>{slot === 'remember' ? 'Keep in mind' : slot === 'care' ? 'A little room for me' : 'It can wait'} note</label>
            <textarea id={`sticky-text-${slot}`} maxLength={600} spellCheck value={page.notes[slot].text} placeholder={stickyHints[slot]} disabled={!ready || !date} onChange={event => writeNote(slot, 'text', event.target.value)}/>
          </article>)}
        </div>
      </div>
    </div>
    <div className="planner-storage"><span>{!ready ? 'Opening your pages…' : storage === 'cloud' ? 'Changes use your connected cloud saving.' : storage === 'device' ? 'Changes are kept on this device.' : 'Session only. Enable saving to keep these pages after you leave.'}</span><button onClick={onSavingPreferences}>Saving preferences</button></div>
  </section>;
}
