import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTimelineData, countEventsAtOrBefore, filterData } from './timelineData';
import { useThemeColors } from './theme';
import { usePlayback } from './usePlayback';
import { useFilters } from './useFilters';
import { useTimelineView } from './useTimelineView';
import { formatDateLabel } from './timeFormat';
import TransportBar from './components/TransportBar';
import OverviewStrip from './components/OverviewStrip';
import TimelineTracks from './components/TimelineTracks';
import ViewControls from './components/ViewControls';
import ActivityPanel from './components/ActivityPanel';
import FilterDrawer from './components/FilterDrawer';

export default function App({ records }) {
  const data = useMemo(() => buildTimelineData(records), [records]);
  const colors = useThemeColors();

  const { visibleGroups, setVisibleGroups, visibleStatuses, setVisibleStatuses } = useFilters(data.groupNames, data.allStatuses);
  const filteredData = useMemo(() => filterData(data, visibleGroups, visibleStatuses), [data, visibleGroups, visibleStatuses]);

  const playback = usePlayback(data);
  const view = useTimelineView(data);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const showRecord = new URLSearchParams(window.location.search).get('show_record') === 'true';

  const passedCount = countEventsAtOrBefore(filteredData.events, playback.playheadTime);

  // Clear selection if its group or status is filtered out.
  useEffect(() => {
    if (selectedEvent && (!visibleGroups.has(selectedEvent.groupName) || !visibleStatuses.has(selectedEvent.status))) {
      setSelectedEvent(null);
    }
  }, [visibleGroups, visibleStatuses, selectedEvent]);

  // Clear selection when the dataset changes.
  useEffect(() => setSelectedEvent(null), [data]);

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
    const event = playback.stepToNeighborEvent(filteredData.events, direction);
    if (event) {
      setSelectedEvent(null);
      view.bringIntoView(event.time);
    }
  };

  const handleShortcutRef = useRef(null);
  handleShortcutRef.current = (event) => {
    const tagName = event.target.tagName;
    if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') return;
    if (tagName === 'BUTTON' && event.key === 'Enter') return;

    const { visibleRange } = view;
    const { playheadTime } = playback;
    const playheadIsVisible = playheadTime >= visibleRange.start && playheadTime <= visibleRange.end;
    const zoomAnchor = playheadIsVisible ? playheadTime : (visibleRange.start + visibleRange.end) / 2;

    const actions = {
      ArrowRight: () => stepAndReveal(1),
      ArrowLeft: () => stepAndReveal(-1),
      '=': () => view.zoomAround(zoomAnchor, 0.5, { rememberPrevious: true }),
      '+': () => view.zoomAround(zoomAnchor, 0.5, { rememberPrevious: true }),
      '-': () => view.zoomOut(),
      0: () => view.fitAll(),
      Escape: () => {
        if (filterDrawerOpen) setFilterDrawerOpen(false);
        else setSelectedEvent(null);
      },
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

  const filterActive = visibleGroups.size < data.groupNames.length || visibleStatuses.size < data.allStatuses.length;

  return (
    <div className="app">
      <header className="page-header">
        <h1>Activity Timeline</h1>
        <p className="summary">
          {filteredData.events.length.toLocaleString()} of {data.events.length.toLocaleString()} activities across{' '}
          {filteredData.groupNames.length} of {data.groupNames.length} chat groups,{' '}
          {formatDateLabel(data.firstEventTime)} to {formatDateLabel(data.lastEventTime)}.
        </p>
      </header>

      <section className="panel timeline-panel">
        <TransportBar
          playheadTime={playback.playheadTime}
          passedCount={passedCount}
          totalCount={filteredData.events.length}
          onStepBackward={() => stepAndReveal(-1)}
          onStepForward={() => stepAndReveal(1)}
          onToggleFilterDrawer={() => setFilterDrawerOpen((open) => !open)}
          filterActive={filterActive}
        />
        <OverviewStrip
          data={filteredData}
          colors={colors}
          fullRange={view.fullRange}
          visibleRange={view.visibleRange}
          playheadTime={playback.playheadTime}
          onChangeRange={view.showRange}
          onRememberRange={view.rememberRange}
        />
        <TimelineTracks
          data={filteredData}
          colors={colors}
          visibleRange={view.visibleRange}
          playheadTime={playback.playheadTime}
          pulseTracker={playback.pulseTracker}
          selectedEvent={selectedEvent}
          showRecord={showRecord}
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
        playhead. Drag the handle at the top to scrub, and drag the window in the strip above to pan. Ctrl + scroll zooms,
        Shift + scroll pans, and the arrow keys step between activities.
      </p>

      <ActivityPanel
        data={filteredData}
        passedCount={passedCount}
        selectedEvent={selectedEvent}
        onSelectEvent={selectEvent}
        colors={colors}
        pulseTracker={playback.pulseTracker}
        showRecord={showRecord}
      />

      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        allGroupNames={data.groupNames}
        visibleGroups={visibleGroups}
        onChangeVisibleGroups={setVisibleGroups}
        allStatuses={data.allStatuses}
        visibleStatuses={visibleStatuses}
        onChangeVisibleStatuses={setVisibleStatuses}
        colors={colors}
      />
    </div>
  );
}
