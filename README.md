# Device Activity Timeline

    npm install
    npm run dev

To use real data, export it from the notebook as a JSON array, save it as
`src/data/activity.json`, and swap the import in `src/main.jsx`.

## Navigation

- **Ctrl/⌘ + F** — open record search (magnifying glass button also opens it)
- **Arrow keys** — step backward/forward one event at a time
- **Drag across the tracks** — zoom into that time span
- **Ctrl + scroll** — zoom in/out around the cursor
- **Shift + scroll / sideways scroll** — pan left/right
- **Drag the overview strip** — pan and resize the visible window
- **Click a marker** — select that event and move the playhead to it
- **0** — fit the full dataset into view
- **Esc** — clear selection / close filter drawer

## Filters & URL params

The funnel button opens a filter drawer with controls for display options, activity status, and chat groups. All settings persist in URL query params and are included when you copy the link with the **share button** (link icon in the transport bar).

## URL params

| Param | Default | Behavior |
| --- | --- | --- |
| `excluded=A,B` | (none) | Hide chat groups A and B from the grid |
| `excludedStatuses=SENT` | (none) | Hide events with that Activity Status |
| `t=start,end` | full range | Visible time window as two Unix-ms timestamps. Set automatically when you pan/zoom. |
| `show_record=false` | (records visible) | Hides the Record field everywhere and disables search. Useful when sharing the timeline without exposing message content. |

## Marker shapes

Markers on the timeline encode the Activity Status field:

| Shape | Status |
| --- | --- |
| ◇ Diamond | RECEIVED |
| □ Square | OPENED |
| ○ Circle | SENT |

All markers are hollow (stroke only).

## Where things live

| File | What it does |
| --- | --- |
| `src/App.jsx` | Puts the page together and wires up keyboard shortcuts |
| `src/timelineData.js` | Turns raw records into timeline events; `filterData()` applies group/status filters |
| `src/usePlayback.js` | Playhead position and step navigation |
| `src/useFilters.js` | Group, status, and record-visibility filter state with URL param persistence |
| `src/useSearch.js` | MiniSearch index over record text; exposes query + results |
| `src/useTimelineView.js` | Which slice of time is on screen, zooming, and zoom history |
| `src/useCanvas.js` | Sizes a canvas and runs its redraw loop |
| `src/drawTimeline.js` | All canvas drawing. `markerStyleFor()` decides how markers look |
| `src/timelineGeometry.js` | Layout, time-to-pixel math, axis ticks, hit testing |
| `src/pulseTracker.js` | Remembers which markers are pulsing |
| `src/timeFormat.js` | Time formatting and parsing |
| `src/components/` | TransportBar, FilterDrawer, OverviewStrip, TimelineTracks, ViewControls, ActivityPanel |
