import type { TraderCalendarEvent } from '@/lib/trader-calendar';

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function utc(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildCalendarFeed(events: TraderCalendarEvent[], origin: string) {
  const now = utc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BuildPair//Trade Working Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BuildPair',
    'X-WR-CALDESC:BuildPair jobs, site visits and published availability',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const event of events) {
    const start = new Date(event.startsAt);
    const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + (event.type === 'availability' ? 60 : 90) * 60 * 1000);
    const url = event.href.startsWith('/') ? `${origin}${event.href}` : event.href;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.id)}@buildpair.co.uk`,
      `DTSTAMP:${now}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(`BuildPair · ${event.type.replace('_', ' ')} · ${event.status}`)}`,
      `URL:${escapeIcs(url)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
