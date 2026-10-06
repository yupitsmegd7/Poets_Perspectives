'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {formatPlannerDate, localDateKey, shelfPageDates, type PlannerDay} from '@/lib/planner';

const bindings = [
  {colour: '#593127', height: '95%'}, {colour: '#344333', height: '100%'},
  {colour: '#6b4b2d', height: '90%'}, {colour: '#343e48', height: '97%'},
  {colour: '#633b40', height: '93%'}, {colour: '#45442b', height: '100%'},
];

export default function PlannerBookshelf({days, date, ready, onOpen}: {
  days: PlannerDay[]; date: string; ready: boolean; onOpen: (date: string) => void;
}) {
  const [pulling, setPulling] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dates = date ? shelfPageDates(days, localDateKey(), date) : [];

  useEffect(() => () => {if (timer.current) clearTimeout(timer.current);}, []);

  function finishPull(next: string) {
    if (pending.current !== next) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setPulling(null);
    onOpen(next);
  }

  function pullBook(next: string) {
    if (!ready || pending.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {onOpen(next); return;}
    pending.current = next;
    setPulling(next);
    // The animation event normally opens the page; this also handles interrupted CSS animations.
    timer.current = setTimeout(() => finishPull(next), 850);
  }

  return <div className="planner-bookshelf" role="group" aria-label="Individual day books">
    <div className="planner-books" data-pulling={Boolean(pulling)}>
      {dates.map((bookDate, index) => {
        const saved = days.find(day => day.date === bookDate);
        const title = saved?.title.trim() || (bookDate === localDateKey() ? 'Today’s little world' : formatPlannerDate(bookDate, true));
        const binding = bindings[index];
        return <button key={bookDate} type="button"
          className={`planner-volume${pulling === bookDate ? ' is-pulling' : ''}`}
          style={{'--book-colour': binding.colour, '--book-height': binding.height} as CSSProperties}
          onClick={() => pullBook(bookDate)} disabled={!ready}
          onAnimationEnd={event => {if (event.target === event.currentTarget && event.animationName === 'planner-book-pull') finishPull(bookDate);}}
          aria-label={`Open ${title}, ${formatPlannerDate(bookDate, true)}${bookDate === date ? ', on your desk' : ''}`}
          aria-controls="planner-day-page" aria-current={bookDate === date ? 'page' : undefined}
          aria-disabled={Boolean(pulling) || !ready}>
          <span className="planner-volume-pages" aria-hidden="true"/>
          <span className="planner-volume-spine" aria-hidden="true"><small>{bookDate.slice(8)}</small><span>{title}</span><i>✦</i></span>
          <span className="planner-volume-tooltip" aria-hidden="true"><strong>{title}</strong><small>{formatPlannerDate(bookDate, true)} · {saved ? 'Open your page' : 'A fresh page'}</small></span>
        </button>;
      })}
    </div>
    <p className="planner-shelf-whisper" role="status">{pulling ? `Opening ${formatPlannerDate(pulling, true)}…` : 'Choose a spine. A different day in every book.'}</p>
  </div>;
}
