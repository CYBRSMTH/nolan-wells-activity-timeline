# Activity Timeline

    npm install
    npm run dev

To use real data, export it from the notebook as a JSON array, save it as
`src/data/activity.json`, and swap the import in `src/main.jsx`.

## Navigation

- **Arrow keys** — step backward/forward one event at a time
- **Drag across the tracks** — zoom into that time span
- **Ctrl + scroll** — zoom in/out around the cursor
- **Shift + scroll / sideways scroll** — pan left/right
- **Drag the overview strip** — pan and resize the visible window
- **Click a marker** — select that event and move the playhead to it
- **0** — fit the full dataset into view
- **Esc** — clear selection / close filter drawer

## Filters (filter drawer)

The funnel button in the top-right of the transport bar opens a filter drawer. Filters are persisted in URL query params so they survive reloads and can be shared.

| Param | Behavior |
| --- | --- |
| `excluded=A,B` | Hide chat groups A and B from the grid |
| `excludedStatuses=SENT` | Hide events with that Activity Status |

Both params accept comma-separated values. Omitting a param means "show all."

The **share button** (link icon, right side of the transport bar) copies the full URL including all active filters and the current viewport to your clipboard so you can send someone an exact view.

## Hidden params

| Param | Default | Behavior |
| --- | --- | --- |
| `t=start,end` | full range | Visible time window as two Unix-ms timestamps. Set automatically when you pan/zoom; use the share button to copy the full URL. |
| `show_record=true` | hidden | Shows the raw Record field in the event tooltip, the activity list, and the event detail panel. Omit or set to anything else to hide it. |

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
| `src/useFilters.js` | Group and status filter state, URL param persistence |
| `src/useTimelineView.js` | Which slice of time is on screen, zooming, and zoom history |
| `src/useCanvas.js` | Sizes a canvas and runs its redraw loop |
| `src/drawTimeline.js` | All canvas drawing. `markerStyleFor()` decides how markers look |
| `src/timelineGeometry.js` | Layout, time-to-pixel math, axis ticks, hit testing |
| `src/pulseTracker.js` | Remembers which markers are pulsing |
| `src/timeFormat.js` | Time formatting and parsing |
| `src/components/` | TransportBar, FilterDrawer, OverviewStrip, TimelineTracks, ViewControls, ActivityPanel |
