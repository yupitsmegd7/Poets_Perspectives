// Shared by the browser, Site API, and standalone MongoDB service.
export const NOTE_SLOTS = ['remember', 'care', 'later'];

export function validPlannerDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const textWithin = (value, limit) => typeof value === 'string' && value.length <= limit;

export function isPlannerDay(day) {
  return !!day && validPlannerDate(day.date) && textWithin(day.title, 100)
    && textWithin(day.body, 6000) && typeof day.updatedAt === 'string'
    && Number.isFinite(Date.parse(day.updatedAt)) && !!day.notes
    && NOTE_SLOTS.every(slot => day.notes[slot]
      && textWithin(day.notes[slot].title, 60) && textWithin(day.notes[slot].text, 600));
}

export function validPlannerDays(days) {
  // Existing scrapbooks written before the planner remain valid.
  return days === undefined || (Array.isArray(days) && days.every(isPlannerDay)
    && new Set(days.map(day => day.date)).size === days.length);
}
