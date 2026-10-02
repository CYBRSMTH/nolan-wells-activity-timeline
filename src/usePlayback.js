import { useCallback, useEffect, useRef, useState } from 'react';
import { createPulseTracker } from './pulseTracker';
import { countEventsAtOrBefore, indexOfFirstEventAtOrAfter } from './timelineData';
import { clamp } from './timelineGeometry';
import { ONE_SECOND, formatDuration } from './timeFormat';

// Playback speed is a multiplier on real time:
// at 60×, one real second covers one minute of log time.
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400];

export function describeSpeed(speed) {
  if (speed < 60) return `${speed}×`;
  return `${speed.toLocaleString()}× (${formatDuration(speed * ONE_SECOND)} per sec)`;
}

/** The speed that plays the whole dataset in about 30 seconds. */
function defaultSpeedFor(data) {
  const idealSpeed = Math.max(data.lastEventTime - data.firstEventTime, 1) / (30 * ONE_SECOND);
  return PLAYBACK_SPEEDS.reduce((best, speed) =>
    Math.abs(Math.log(speed / idealSpeed)) < Math.abs(Math.log(best / idealSpeed)) ? speed : best,
  );
}

// A gap counts as "quiet" if, at the current speed, nothing would happen for
// this long in real time. We jump to just before the next event.
const QUIET_GAP_REAL_MS = 1500;
const LEAD_IN_REAL_MS = 350;

// If the tab was in the background, don't jump ahead by the whole time away.
const MAX_FRAME_STEP_MS = 100;

/**
 * Owns the playhead: where it is, whether it's moving, and how fast.
 * While playing, a requestAnimationFrame loop moves it forward by
 * (real time elapsed × speed) every frame.
 */
export function usePlayback(data, { onQuietGapSkipped } = {}) {
  const [playheadTime, setPlayheadTime] = useState(data.firstEventTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => defaultSpeedFor(data));
  const [skipQuietGaps, setSkipQuietGaps] = useState(true);
  const [pulseTracker] = useState(createPulseTracker);

  // The animation loop reads the playhead from a ref so it always sees the
  // latest value without restarting every frame.
  const playheadRef = useRef(playheadTime);
  const onQuietGapSkippedRef = useRef(onQuietGapSkipped);
  useEffect(() => {
    onQuietGapSkippedRef.current = onQuietGapSkipped;
  });

  const seek = useCallback(
    (time) => {
      const clampedTime = clamp(time, data.firstEventTime, data.lastEventTime);
      playheadRef.current = clampedTime;
      setPlayheadTime(clampedTime);
    },
    [data],
  );

  // Start over when a new dataset arrives.
  useEffect(() => {
    pulseTracker.clear();
    setIsPlaying(false);
    setPlaybackSpeed(defaultSpeedFor(data));
    seek(data.firstEventTime);
  }, [data, seek, pulseTracker]);

  // The playback loop.
  useEffect(() => {
    if (!isPlaying) return undefined;

    let previousFrameAt = performance.now();
    let frameId;

    const advance = (now) => {
      const realElapsedMs = Math.min(now - previousFrameAt, MAX_FRAME_STEP_MS);
      previousFrameAt = now;

      const fromTime = playheadRef.current;
      let toTime = fromTime + realElapsedMs * playbackSpeed;

      if (skipQuietGaps) {
        const nextEvent = data.events[countEventsAtOrBefore(data.events, fromTime)];
        if (nextEvent) {
          const jumpTarget = nextEvent.time - LEAD_IN_REAL_MS * playbackSpeed;
          const gapIsQuiet = nextEvent.time - fromTime > QUIET_GAP_REAL_MS * playbackSpeed;
          if (gapIsQuiet && toTime < jumpTarget) {
            onQuietGapSkippedRef.current?.(jumpTarget - fromTime);
            toTime = jumpTarget;
          }
        }
      }

      const reachedEnd = toTime >= data.lastEventTime;
      if (reachedEnd) toTime = data.lastEventTime;

      pulseTracker.markCrossed(data.events, fromTime, toTime, now);
      playheadRef.current = toTime;
      setPlayheadTime(toTime);

      if (reachedEnd) setIsPlaying(false);
      else frameId = requestAnimationFrame(advance);
    };

    frameId = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, skipQuietGaps, data, pulseTracker]);

  const togglePlay = useCallback(() => {
    const isAtEnd = playheadRef.current >= data.lastEventTime;
    if (!isPlaying && isAtEnd) {
      pulseTracker.clear();
      seek(data.firstEventTime);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, data, seek, pulseTracker]);

  /** Jump to the next (direction 1) or previous (direction -1) event. Returns it, or null. */
  const stepToNeighborEvent = useCallback(
    (direction) => {
      const index =
        direction > 0
          ? countEventsAtOrBefore(data.events, playheadRef.current)
          : indexOfFirstEventAtOrAfter(data.events, playheadRef.current) - 1;
      const event = data.events[index];
      if (!event) return null;
      seek(event.time);
      // Pulse every event at that exact moment, across all groups.
      pulseTracker.markCrossed(data.events, event.time - 1, event.time, performance.now());
      return event;
    },
    [data, seek, pulseTracker],
  );

  const pulseEvent = useCallback((event) => pulseTracker.markEvent(event, performance.now()), [pulseTracker]);

  return {
    playheadTime,
    isPlaying,
    togglePlay,
    seek,
    stepToNeighborEvent,
    playbackSpeed,
    setPlaybackSpeed,
    skipQuietGaps,
    setSkipQuietGaps,
    pulseTracker,
    pulseEvent,
  };
}
