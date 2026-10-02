// Fake records in exactly the same shape as the real JSON export, so the UI
// can be built and tested without the real data. Deterministic: the same
// seed always produces the same records.

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const JULY_4_2026_MIDNIGHT_PACIFIC = 1783148400000;
const PACIFIC_DAYLIGHT_OFFSET_MS = -7 * HOUR; // matches the July sample dates

const GROUPS = [
  { name: 'Group 1', sessionsPerDay: 6 },
  { name: 'Group 2', sessionsPerDay: 4 },
  { name: 'Group 3', sessionsPerDay: 5 },
  { name: 'Group 4', sessionsPerDay: 2 },
  { name: 'Group 5', sessionsPerDay: 3 },
];

/** Small seeded random number generator (mulberry32). Returns numbers in [0, 1). */
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (number, width = 2) => String(number).padStart(width, '0');

/** Epoch ms → "07/04/2026 04:38:00.819 PM" in Pacific time, like the real export. */
function formatUsTimestamp(epochMs) {
  const wallClock = new Date(epochMs + PACIFIC_DAYLIGHT_OFFSET_MS);
  const hour24 = wallClock.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? 'AM' : 'PM';
  return (
    `${pad(wallClock.getUTCMonth() + 1)}/${pad(wallClock.getUTCDate())}/${wallClock.getUTCFullYear()} ` +
    `${pad(hour12)}:${pad(wallClock.getUTCMinutes())}:${pad(wallClock.getUTCSeconds())}.${pad(wallClock.getUTCMilliseconds(), 3)} ${period}`
  );
}

export function generateSampleRecords({ days = 3, seed = 704 } = {}) {
  const random = createRandom(seed);
  const between = (min, max) => min + random() * (max - min);
  const wholeBetween = (min, max) => Math.floor(between(min, max + 1));
  const pickOne = (list) => list[Math.floor(random() * list.length)];

  // 1. Decide when activity happens: bursts ("sessions") during waking hours.
  const activities = [];
  for (let day = 0; day < days; day += 1) {
    for (const group of GROUPS) {
      const sessionCount = Math.max(1, Math.round(group.sessionsPerDay * between(0.6, 1.4)));
      for (let session = 0; session < sessionCount; session += 1) {
        let time = JULY_4_2026_MIDNIGHT_PACIFIC + day * DAY + between(8, 25) * HOUR; // 8 AM to 1 AM
        const activitiesInSession = wholeBetween(2, 14);
        for (let i = 0; i < activitiesInSession; i += 1) {
          activities.push({ time: Math.round(time), groupName: group.name });
          time += between(15 * SECOND, 6 * MINUTE) * (random() < 0.15 ? 4 : 1);
        }
      }
    }
  }
  activities.sort((a, b) => a.time - b.time);

  // 2. Fill in each record's fields.
  let rowid = 504375;
  let cmid = 313796;
  let smid = 22458;
  const countPerGroup = new Map();

  const recordTemplates = [
    () => 'media=1',
    () => `media=1 type=image size=${wholeBetween(120, 2400)}KB`,
    () => `media=2 type=video duration=00:00:${pad(wholeBetween(3, 59))} size=${between(1, 20).toFixed(1)}MB`,
    () => `text=1 chars=${wholeBetween(4, 320)}`,
    () => `text=1 chars=${wholeBetween(4, 120)} reply_to=${cmid - wholeBetween(1, 30)}`,
    () => `media=1 type=audio duration=00:00:${pad(wholeBetween(2, 45))}`,
    () => `sticker=1 pack=default id=${wholeBetween(100, 999)}`,
    () => `media=3 type=image,image,video album=1 caption_chars=${wholeBetween(0, 140)}`,
    () =>
      `event=open client=ios/17.5.1 app=4.12.0 net=${pickOne(['wifi', 'cell'])} media=1 type=image ` +
      `size=${wholeBetween(200, 1800)}KB thumb=${pickOne(['cached', 'fetched'])} decrypt_ms=${wholeBetween(8, 90)} ` +
      `render_ms=${wholeBetween(40, 400)} thread=${wholeBetween(8000, 9999)}`,
  ];

  return activities.map(({ time, groupName }) => {
    // Usually opened seconds after it was recorded; sometimes much later.
    const recordedBeforeMs = Math.round(random() < 0.12 ? between(10 * MINUTE, 3 * HOUR) : between(0.5 * SECOND, 90 * SECOND));
    rowid += wholeBetween(1, 60);
    cmid += wholeBetween(1, 12);
    if (random() < 0.3) smid += 1;
    const countForGroup = (countPerGroup.get(groupName) ?? 0) + 1;
    countPerGroup.set(groupName, countForGroup);

    return {
      '#': countForGroup, // repeats across groups, like the real data
      'Activity Timestamp': formatUsTimestamp(time),
      'Record timestamp': formatUsTimestamp(time - recordedBeforeMs),
      Record: pickOne(recordTemplates)(),
      'Chat Group': groupName,
      'Activity Status': 'OPENED',
      'Message Viewed': random() < 0.92 ? 'Yes' : 'No',
      'Message Saved': random() < 0.65 ? 'Yes' : 'No',
      rowid: String(rowid),
      cmid: String(cmid),
      smid: String(smid),
      t: time,
    };
  });
}
