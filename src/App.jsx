import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTimelineData, countEventsAtOrBefore } from './timelineData';
import { useThemeColors } from './theme';
import { usePlayback, PLAYBACK_SPEEDS } from './usePlayback';
import { useTimelineView } from './useTimelineView';
import { formatDateLabel, formatDuration } from './timeFormat';
import TransportBar from './components/TransportBar';
import OverviewStrip from './components/OverviewStrip';
import TimelineTracks from './components/TimelineTracks';
import ViewControls from './components/ViewControls';
import ActivityPanel from './components/ActivityPanel';
import Toast, { useToast } from './components/Toast';

export default function App({ records }) {
  const data = useMemo(() => buildTimelineData(records), [records]);
  const colors = useThemeColors();
  const { message: toastMessage, isVisible: toastIsVisible, showToast } = useToast();

  const playback = usePlayback(data, {
    onQuietGapSkipped: (skippedMs) => showToast(`Skipped ${formatDuration(skippedMs)} with no activity`),
  });
  const view = useTimelineView(data);

  const [followPlayhead, setFollowPlayhead] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const passedCount = countEventsAtOrBefore(data.events, playback.playheadTime);

  // While playing, scroll the tracks along with the playhead.
  const { isPlaying, playheadTime } = playback;
  const { followTime } = view;
  useEffect(() => {
    if (isPlaying && followPlayhead) followTime(playheadTime);
  }, [isPlaying, followPlayhead, playheadTime, followTime]);

  // Clear the selection when the dataset changes.
  useEffect(() => setSelectedEvent(null), [data]);

  /** Select an activity (or pass null to clear): jumps the playhead to it and pulses it. */
  const selectEvent = useCallback(
    (event) => {
      setSelectedEvent(event);
      if (!event) return;
      playback.seek(event.time);
      playback.pulseEvent(event);
      view.bringIntoView(event.time);
    },
    [playback, view],
  );

  const stepAndReveal = (direction) => {
    const event = playback.stepToNeighborEvent(direction);
    if (event) view.bringIntoView(event.time);
  };

  const changeSpeedBy = (steps) => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playback.playbackSpeed);
    const nextSpeed = PLAYBACK_SPEEDS[Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIndex + steps))];
    playback.setPlaybackSpeed(nextSpeed);
    showToast(`Speed ${nextSpeed.toLocaleString()}×`);
  };

  // Keyboard shortcuts. The listener is attached once and always calls the
  // latest version of this function through a ref.
  const handleShortcutRef = useRef(null);
  handleShortcutRef.current = (event) => {
    const tagName = event.target.tagName;
    if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') return;
    if (tagName === 'BUTTON' && (event.key === ' ' || event.key === 'Enter')) return;

    const { visibleRange } = view;
    const playheadIsVisible = playheadTime >= visibleRange.start && playheadTime <= visibleRange.end;
    const zoomAnchor = playheadIsVisible ? playheadTime : (visibleRange.start + visibleRange.end) / 2;

    const actions = {
      ' ': () => playback.togglePlay(),
      ArrowRight: () => stepAndReveal(1),
      ArrowLeft: () => stepAndReveal(-1),
      '=': () => view.zoomAround(zoomAnchor, 0.5, { rememberPrevious: true }),
      '+': () => view.zoomAround(zoomAnchor, 0.5, { rememberPrevious: true }),
      '-': () => view.zoomOut(),
      0: () => view.fitAll(),
      ']': () => changeSpeedBy(1),
      '[': () => changeSpeedBy(-1),
      Escape: () => setSelectedEvent(null),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };
  useEffect(() => {
    const listener = (event) => handleShortcutRef.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div className="app">
      <header className="page-header">
        <h1>Activity replay</h1>
        <p className="summary">
          {data.events.length.toLocaleString()} activities across {data.groupNames.length} chat groups,{' '}
          {formatDateLabel(data.firstEventTime)} to {formatDateLabel(data.lastEventTime)}.
        </p>
      </header>

      <section className="panel timeline-panel">
        <TransportBar
          playheadTime={playheadTime}
          passedCount={passedCount}
          totalCount={data.events.length}
          isPlaying={isPlaying}
          onTogglePlay={playback.togglePlay}
          onStepBackward={() => stepAndReveal(-1)}
          onStepForward={() => stepAndReveal(1)}
          playbackSpeed={playback.playbackSpeed}
          onChangeSpeed={playback.setPlaybackSpeed}
          skipQuietGaps={playback.skipQuietGaps}
          onChangeSkipQuietGaps={playback.setSkipQuietGaps}
          followPlayhead={followPlayhead}
          onChangeFollowPlayhead={setFollowPlayhead}
        />
        <OverviewStrip
          data={data}
          colors={colors}
          fullRange={view.fullRange}
          visibleRange={view.visibleRange}
          playheadTime={playheadTime}
          onChangeRange={view.showRange}
          onRememberRange={view.rememberRange}
        />
        <TimelineTracks
          data={data}
          colors={colors}
          visibleRange={view.visibleRange}
          playheadTime={playheadTime}
          pulseTracker={playback.pulseTracker}
          selectedEvent={selectedEvent}
          onSeek={playback.seek}
          onSelectEvent={selectEvent}
          onZoomToRange={(range) => view.showRange(range, { rememberPrevious: true })}
          onZoomAround={view.zoomAround}
          onPanBy={view.panBy}
        />
        <ViewControls visibleRange={view.visibleRange} canZoomOut={view.canZoomOut} onZoomOut={view.zoomOut} onFitAll={view.fitAll} />
      </section>

      <p className="hint">
        Drag across the tracks to zoom into that span. Tap a marker to see its full record, or tap an empty spot to move the
        playhead. Drag the handle at the top to scrub, and drag the window in the strip above to pan. Ctrl + scroll zooms, Space
        plays and pauses, and the arrow keys step between activities.
      </p>

      <ActivityPanel
        data={data}
        passedCount={passedCount}
        selectedEvent={selectedEvent}
        onSelectEvent={selectEvent}
        colors={colors}
        pulseTracker={playback.pulseTracker}
      />

      <Toast message={toastMessage} isVisible={toastIsVisible} />
    </div>
  );
}
