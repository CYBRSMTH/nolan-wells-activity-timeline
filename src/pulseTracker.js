import { countEventsAtOrBefore } from './timelineData';

export const PULSE_DURATION_MS = 750;

// At very high speeds thousands of events can be crossed in one frame;
// only the latest ones need a visible pulse.
const MAX_PULSES_PER_FRAME = 400;

/**
 * Remembers when each event was crossed by the playhead so the canvas can
 * draw a fading ring around it. Plain mutable object (not React state):
 * it changes every frame and nothing needs to re-render because of it.
 */
export function createPulseTracker() {
  const firedAtByEventId = new Map();

  function forgetFinishedPulses(now) {
    for (const [eventId, firedAt] of firedAtByEventId) {
      if (now - firedAt > PULSE_DURATION_MS) firedAtByEventId.delete(eventId);
    }
  }

  return {
    /** Start pulses for every event the playhead passed between two times. */
    markCrossed(sortedEvents, fromTime, toTime, now) {
      const firstCrossed = countEventsAtOrBefore(sortedEvents, fromTime);
      const endCrossed = countEventsAtOrBefore(sortedEvents, toTime);
      for (let index = Math.max(firstCrossed, endCrossed - MAX_PULSES_PER_FRAME); index < endCrossed; index += 1) {
        firedAtByEventId.set(sortedEvents[index].id, now);
      }
      if (firedAtByEventId.size > 5000) forgetFinishedPulses(now);
    },

    markEvent(event, now) {
      firedAtByEventId.set(event.id, now);
    },

    /** 0 → 1 while the pulse runs, null when there is no pulse. */
    pulseProgress(eventId, now) {
      const firedAt = firedAtByEventId.get(eventId);
      if (firedAt === undefined) return null;
      const progress = (now - firedAt) / PULSE_DURATION_MS;
      return progress >= 0 && progress < 1 ? progress : null;
    },

    firedWithin(eventId, now, windowMs) {
      const firedAt = firedAtByEventId.get(eventId);
      return firedAt !== undefined && now - firedAt < windowMs;
    },

    clear() {
      firedAtByEventId.clear();
    },
  };
}
