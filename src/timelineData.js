import { parseUsTimestamp } from './timeFormat';

/**
 * Turns raw activity records (the JSON exported from the notebooks) into the
 * shape the timeline draws from. The source field names only appear in this
 * file, so if the schema changes, `toTimelineEvent` is the one place to update.
 *
 * Returns:
 *   events         every event, sorted by time
 *   groupNames     one entry per track, top to bottom
 *   eventsByGroup  events split per track (same order as groupNames), each sorted by time
 */
export function buildTimelineData(records) {
  const events = records
    .filter((record) => Number.isFinite(record.t))
    .map(toTimelineEvent)
    .sort((a, b) => a.time - b.time);

  events.forEach((event, index) => {
    event.id = index;
  });

  // "Group 2" before "Group 10".
  const groupNames = [...new Set(events.map((event) => event.groupName))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const groupIndexByName = new Map(groupNames.map((name, index) => [name, index]));

  const eventsByGroup = groupNames.map(() => []);
  for (const event of events) {
    event.groupIndex = groupIndexByName.get(event.groupName);
    eventsByGroup[event.groupIndex].push(event);
  }

  const now = Date.now();
  return {
    events,
    groupNames,
    eventsByGroup,
    firstEventTime: events.length ? events[0].time : now,
    lastEventTime: events.length ? events[events.length - 1].time : now,
  };
}

function toTimelineEvent(record) {
  // `t` is the Activity Timestamp as epoch ms, made in the notebook with the
  // right time zone. The Record timestamp has no numeric column, so we work out
  // how long before the activity it happened by comparing the two strings.
  // Both are in the same zone, so the difference between them is reliable.
  const activityWallClock = parseUsTimestamp(record['Activity Timestamp']);
  const recordWallClock = parseUsTimestamp(record['Record timestamp']);
  const recordToActivityMs =
    activityWallClock !== null && recordWallClock !== null ? activityWallClock - recordWallClock : null;

  return {
    time: record.t,
    recordTime: recordToActivityMs !== null ? record.t - recordToActivityMs : null,
    groupName: record['Chat Group'] || 'No group',
    status: record['Activity Status'] || '',
    wasViewed: record['Message Viewed'] === 'Yes',
    wasSaved: record['Message Saved'] === 'Yes',
    recordText: record.Record ?? '',
    rowId: record.rowid,
    cmid: record.cmid,
    smid: record.smid,
  };
}

/** How many events happen at or before `time`. Also the index of the first event after it. */
export function countEventsAtOrBefore(sortedEvents, time) {
  let low = 0;
  let high = sortedEvents.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sortedEvents[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Index of the first event that happens at or after `time`. */
export function indexOfFirstEventAtOrAfter(sortedEvents, time) {
  let low = 0;
  let high = sortedEvents.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sortedEvents[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}
