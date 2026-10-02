import { useCallback, useEffect, useRef, useState } from 'react';
import { createPulseTracker } from './pulseTracker';
import { countEventsAtOrBefore, indexOfFirstEventAtOrAfter } from './timelineData';
import { clamp } from './timelineGeometry';

/** Manages the playhead position and event navigation. */
export function usePlayback(data) {
  const [playheadTime, setPlayheadTime] = useState(data.firstEventTime);
  const [pulseTracker] = useState(createPulseTracker);
  const playheadRef = useRef(playheadTime);

  const seek = useCallback(
    (time) => {
      const clampedTime = clamp(time, data.firstEventTime, data.lastEventTime);
      playheadRef.current = clampedTime;
      setPlayheadTime(clampedTime);
    },
    [data],
  );

  // Reset when a new dataset arrives.
  useEffect(() => {
    pulseTracker.clear();
    seek(data.firstEventTime);
  }, [data, seek, pulseTracker]);

  /** Jump to the next (direction 1) or previous (direction -1) event in `events`. Returns it, or null. */
  const stepToNeighborEvent = useCallback(
    (events, direction) => {
      const index =
        direction > 0
          ? countEventsAtOrBefore(events, playheadRef.current)
          : indexOfFirstEventAtOrAfter(events, playheadRef.current) - 1;
      const event = events[index];
      if (!event) return null;
      seek(event.time);
      pulseTracker.markCrossed(events, event.time - 1, event.time, performance.now());
      return event;
    },
    [seek, pulseTracker],
  );

  const pulseEvent = useCallback((event) => pulseTracker.markEvent(event, performance.now()), [pulseTracker]);

  return {
    playheadTime,
    seek,
    stepToNeighborEvent,
    pulseTracker,
    pulseEvent,
  };
}
