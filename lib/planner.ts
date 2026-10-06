import {isPlannerDay, validPlannerDate} from '@/backend/planner.mjs';

export type NoteSlot = 'remember' | 'care' | 'later';
export type PlannerNote = {title: string; text: string};
export type PlannerDay = {
  date: string;
  title: string;
  body: string;
  notes: Record<NoteSlot, PlannerNote>;
  updatedAt: string;
};

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function shiftPlannerDate(date: string, offset: number) {
  const parsed = new Date(date + 'T12:00:00');
  parsed.setDate(parsed.getDate() + offset);
  return localDateKey(parsed);
}

export function formatPlannerDate(date: string, short = false) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', short
    ? {day: 'numeric', month: 'short', year: 'numeric'}
    : {weekday: 'long', day: 'numeric', month: 'long'});
}

export function blankPlannerDay(date: string): PlannerDay {
  return {
    date, title: '', body: '', updatedAt: new Date().toISOString(),
    notes: {
      remember: {title: 'Keep in mind', text: ''},
      care: {title: 'A little room for me', text: ''},
      later: {title: 'It can wait', text: ''},
    },
  };
}

export function normalizePlannerDays(value: unknown): PlannerDay[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, PlannerDay>();
  for (const day of value) if (isPlannerDay(day)) unique.set(day.date, day);
  return [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function putPlannerDay(days: PlannerDay[], page: PlannerDay) {
  if (!isPlannerDay(page)) return days;
  return [...days.filter(day => day.date !== page.date), page]
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function searchPlannerDays(days: PlannerDay[], query: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return days.filter(day => {
    const text = [day.date, formatPlannerDate(day.date), day.title, day.body,
      ...Object.values(day.notes).flatMap(note => [note.title, note.text])].join(' ').toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
}

// Keep six distinct dated volumes on the shelf, including the open page.
// Blank volumes become saved pages only when somebody writes in them.
export function shelfPageDates(days: PlannerDay[], today: string, selected: string) {
  if (!validPlannerDate(today)) return [];
  const dates = new Set<string>([today]);
  if (validPlannerDate(selected)) dates.add(selected);
  for (const day of days) {
    if (dates.size >= 6) break;
    if (validPlannerDate(day.date)) dates.add(day.date);
  }
  for (let offset = 1; dates.size < 6; offset++) dates.add(shiftPlannerDate(today, -offset));
  return [...dates].sort((a, b) => b.localeCompare(a));
}

export {validPlannerDate};
