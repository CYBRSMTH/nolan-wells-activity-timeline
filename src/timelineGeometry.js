// Layout, time-to-pixel conversion, axis ticks and hit testing.
// Nothing in here draws; it only answers "where is it?" questions.

import { ONE_SECOND, ONE_MINUTE, ONE_HOUR, ONE_DAY } from './timeFormat';
import { indexOfFirstEventAtOrAfter } from './timelineData';

const RULER_HEIGHT = 26; // strip above the tracks where the playhead handle sits
const ROW_HEIGHT = 28; // height of one group's track
const AXIS_HEIGHT = 30; // timestamp labels under the tracks
const RIGHT_PADDING = 16;

export const MIN_VISIBLE_SPAN_MS = 50;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const isNarrowWidth = (width) => width < 560;
const labelColumnWidth = (width) => (isNarrowWidth(width) ? 92 : 136);

/** Where everything sits on the main tracks canvas. */
export function getTrackLayout(width, groupCount) {
  const rowsHeight = ROW_HEIGHT * Math.max(groupCount, 1);
  return {
    width,
    height: RULER_HEIGHT + rowsHeight + AXIS_HEIGHT,
    tracksLeft: labelColumnWidth(width),
    tracksRight: width - RIGHT_PADDING,
    rulerHeight: RULER_HEIGHT,
    rowHeight: ROW_HEIGHT,
    axisTop: RULER_HEIGHT + rowsHeight,
    isNarrow: isNarrowWidth(width),
  };
}

/** The overview strip uses the same left and right edges so the two line up. */
export function getOverviewLayout(width, height) {
  return { width, height, left: labelColumnWidth(width), right: width - RIGHT_PADDING };
}

/**
 * Maps a time range onto a horizontal pixel span, and back.
 * This is the one piece of math the whole timeline is built on.
 */
export function createTimeScale(range, leftX, rightX) {
  const pixelsPerMs = (rightX - leftX) / (range.end - range.start);
  return {
    timeToX: (time) => leftX + (time - range.start) * pixelsPerMs,
    xToTime: (x) => range.start + (x - leftX) / pixelsPerMs,
  };
}

/** Vertical center of a group's track. The +0.5 keeps 1px lines crisp. */
export function rowCenterY(layout, groupIndex) {
  return Math.round(layout.rulerHeight + groupIndex * layout.rowHeight + layout.rowHeight / 2) + 0.5;
}

const TICK_SPACINGS_MS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  ONE_SECOND, 2 * ONE_SECOND, 5 * ONE_SECOND, 10 * ONE_SECOND, 15 * ONE_SECOND, 30 * ONE_SECOND,
  ONE_MINUTE, 2 * ONE_MINUTE, 5 * ONE_MINUTE, 10 * ONE_MINUTE, 15 * ONE_MINUTE, 30 * ONE_MINUTE,
  ONE_HOUR, 2 * ONE_HOUR, 3 * ONE_HOUR, 6 * ONE_HOUR, 12 * ONE_HOUR,
  ONE_DAY, 2 * ONE_DAY, 7 * ONE_DAY,
];

/** Picks a "nice" tick spacing for the zoom level and lists the tick times. */
export function chooseAxisTicks(range, pixelWidth, isNarrow) {
  const targetTickCount = Math.max(2, Math.floor(pixelWidth / (isNarrow ? 84 : 110)));
  const idealSpacing = (range.end - range.start) / targetTickCount;
  const spacing = TICK_SPACINGS_MS.find((candidate) => candidate >= idealSpacing) ?? TICK_SPACINGS_MS.at(-1);

  // Line ticks up with the viewer's local clock (whole hours, local midnight)
  // rather than with UTC.
  const timezoneOffsetMs = new Date(range.start).getTimezoneOffset() * ONE_MINUTE;
  const firstTick = Math.ceil((range.start - timezoneOffsetMs) / spacing) * spacing + timezoneOffsetMs;

  const times = [];
  for (let time = firstTick; time <= range.end; time += spacing) times.push(time);
  return { spacing, times };
}

/** The event under (x, y) on the tracks canvas, if one is within `tolerancePx`. */
export function findEventNear(data, layout, scale, x, y, tolerancePx) {
  const groupIndex = Math.floor((y - layout.rulerHeight) / layout.rowHeight);
  if (groupIndex < 0 || groupIndex >= data.groupNames.length) return null;
  if (x < layout.tracksLeft - tolerancePx || x > layout.tracksRight + tolerancePx) return null;

  const groupEvents = data.eventsByGroup[groupIndex];
  const nextIndex = indexOfFirstEventAtOrAfter(groupEvents, scale.xToTime(x));

  let closestEvent = null;
  let closestDistance = tolerancePx;
  for (const candidate of [groupEvents[nextIndex - 1], groupEvents[nextIndex]]) {
    if (!candidate) continue;
    const distance = Math.abs(scale.timeToX(candidate.time) - x);
    if (distance <= closestDistance) {
      closestEvent = candidate;
      closestDistance = distance;
    }
  }
  return closestEvent;
}
