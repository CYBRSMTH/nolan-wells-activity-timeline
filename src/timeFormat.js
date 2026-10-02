// Formatting and parsing helpers for timestamps.
// Everywhere else in the app, a time is a plain number: epoch milliseconds.

export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

const pad = (number, width = 2) => String(number).padStart(width, '0');

/** "16:38:00.819" in the viewer's local time zone. */
export function formatClockTime(time) {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** "Sat, Jul 4, 2026" */
export function formatDateLabel(time) {
  return new Date(time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Jul 4" */
export function formatShortDate(time) {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isLocalMidnight(time) {
  const date = new Date(time);
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

/** Label for an axis tick. The further apart the ticks, the less precision we show. */
export function formatAxisLabel(time, tickSpacingMs) {
  if (tickSpacingMs >= ONE_DAY || (tickSpacingMs >= ONE_MINUTE && isLocalMidnight(time))) {
    return formatShortDate(time);
  }
  const date = new Date(time);
  const hoursAndMinutes = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (tickSpacingMs >= ONE_MINUTE) return hoursAndMinutes;
  if (tickSpacingMs >= ONE_SECOND) return `${hoursAndMinutes}:${pad(date.getSeconds())}`;
  return `${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** Human-friendly length of time: "450 ms", "8.2 s", "4m 12s", "3h 5m", "2d 4h". */
export function formatDuration(durationMs) {
  const ms = Math.abs(durationMs);
  if (ms < ONE_SECOND) return `${Math.round(ms)} ms`;

  const totalSeconds = ms / ONE_SECOND;
  if (totalSeconds < 60) return `${totalSeconds < 10 ? totalSeconds.toFixed(1) : Math.floor(totalSeconds)} s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  if (hours < 24) return leftoverMinutes ? `${hours}h ${leftoverMinutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  return leftoverHours ? `${days}d ${leftoverHours}h` : `${days}d`;
}

const US_TIMESTAMP = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\s*(AM|PM)$/i;

/**
 * Parses "07/04/2026 04:38:00.819 PM" as wall-clock time in the viewer's zone.
 * Returns epoch ms, or null if the text doesn't match.
 */
export function parseUsTimestamp(text) {
  const match = typeof text === 'string' ? text.trim().match(US_TIMESTAMP) : null;
  if (!match) return null;

  const [, month, day, year, hour12, minute, second, fraction = '0', period] = match;
  const hour24 = (Number(hour12) % 12) + (period.toUpperCase() === 'PM' ? 12 : 0);
  const milliseconds = Number(fraction.padEnd(3, '0'));

  return new Date(Number(year), Number(month) - 1, Number(day), hour24, Number(minute), Number(second), milliseconds).getTime();
}
