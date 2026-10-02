import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MIN_VISIBLE_SPAN_MS, clamp } from './timelineGeometry';
import { ONE_SECOND } from './timeFormat';

/**
 * Owns which slice of time the tracks show (the "visible range"), plus a
 * history of zoom levels so "Zoom out" can step back through them.
 */
export function useTimelineView(data) {
  // The whole dataset, with a little breathing room on each side.
  const fullRange = useMemo(() => {
    const span = Math.max(data.lastEventTime - data.firstEventTime, ONE_SECOND);
    const padding = span * 0.02;
    return { start: data.firstEventTime - padding, end: data.lastEventTime + padding };
  }, [data]);

  const [visibleRange, setVisibleRangeState] = useState(fullRange);
  const [zoomHistory, setZoomHistory] = useState([]);
  const visibleRangeRef = useRef(visibleRange);

  const fullSpan = fullRange.end - fullRange.start;
  const maxVisibleSpan = fullSpan * 1.25;

  /** Set the visible range, keeping it within sensible zoom limits. */
  const showRange = useCallback(
    (range, { rememberPrevious = false } = {}) => {
      const span = clamp(range.end - range.start, MIN_VISIBLE_SPAN_MS, maxVisibleSpan);
      const center = (range.start + range.end) / 2;
      const nextRange = { start: center - span / 2, end: center + span / 2 };

      if (rememberPrevious) {
        const previousRange = visibleRangeRef.current;
        setZoomHistory((history) => [...history, previousRange]);
      }
      visibleRangeRef.current = nextRange;
      setVisibleRangeState(nextRange);
    },
    [maxVisibleSpan],
  );

  useEffect(() => {
    setZoomHistory([]);
    visibleRangeRef.current = fullRange;
    setVisibleRangeState(fullRange);
  }, [fullRange]);

  /** Zoom by `factor` (0.5 = in, 2 = out) keeping `anchorTime` in the same spot on screen. */
  const zoomAround = useCallback(
    (anchorTime, factor, options) => {
      const current = visibleRangeRef.current;
      const newSpan = (current.end - current.start) * factor;
      const anchorFraction = (anchorTime - current.start) / (current.end - current.start);
      const start = anchorTime - newSpan * anchorFraction;
      showRange({ start, end: start + newSpan }, options);
    },
    [showRange],
  );

  const panBy = useCallback(
    (deltaMs) => {
      const current = visibleRangeRef.current;
      showRange({ start: current.start + deltaMs, end: current.end + deltaMs });
    },
    [showRange],
  );

  /** Remember a range in the zoom history (used after dragging in the overview). */
  const rememberRange = useCallback((range) => setZoomHistory((history) => [...history, range]), []);

  const zoomOut = useCallback(() => {
    if (zoomHistory.length > 0) {
      const previousRange = zoomHistory[zoomHistory.length - 1];
      setZoomHistory(zoomHistory.slice(0, -1));
      showRange(previousRange);
    } else {
      const current = visibleRangeRef.current;
      zoomAround((current.start + current.end) / 2, 2);
    }
  }, [zoomHistory, showRange, zoomAround]);

  const fitAll = useCallback(() => showRange(fullRange, { rememberPrevious: true }), [fullRange, showRange]);

  /** If `time` is off screen, scroll so it's in the middle. */
  const bringIntoView = useCallback(
    (time) => {
      const current = visibleRangeRef.current;
      if (time >= current.start && time <= current.end) return;
      const span = current.end - current.start;
      showRange({ start: time - span / 2, end: time + span / 2 });
    },
    [showRange],
  );

  /** While playing: once the playhead passes 85% of the way across, scroll with it. */
  const followTime = useCallback(
    (time) => {
      const current = visibleRangeRef.current;
      const span = current.end - current.start;
      const followPoint = current.start + span * 0.85;
      if (time > followPoint) showRange({ start: time - span * 0.85, end: time + span * 0.15 });
      else if (time < current.start) showRange({ start: time - span * 0.1, end: time + span * 0.9 });
    },
    [showRange],
  );

  const visibleSpan = visibleRange.end - visibleRange.start;

  return {
    fullRange,
    visibleRange,
    showRange,
    zoomAround,
    panBy,
    rememberRange,
    zoomOut,
    fitAll,
    bringIntoView,
    followTime,
    canZoomOut: zoomHistory.length > 0 || visibleSpan < maxVisibleSpan * 0.99,
  };
}
