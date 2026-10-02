# Activity replay

    npm install
    npm run dev

To use real data, export it from the notebook as a JSON array, save it as
`src/data/activity.json`, and swap the import in `src/main.jsx`.

## Where things live

| File | What it does |
| --- | --- |
| `src/App.jsx` | Puts the page together and wires up keyboard shortcuts |
| `src/timelineData.js` | Turns raw records into timeline events. The only file that knows the JSON field names |
| `src/usePlayback.js` | The playhead: play/pause, speed, skipping quiet gaps |
| `src/useTimelineView.js` | Which slice of time is on screen, zooming, and zoom history |
| `src/useCanvas.js` | Sizes a canvas and runs its redraw loop |
| `src/drawTimeline.js` | All canvas drawing. `markerStyleFor()` decides how markers look |
| `src/timelineGeometry.js` | Layout, time-to-pixel math, axis ticks, hit testing |
| `src/pulseTracker.js` | Remembers which markers are pulsing |
| `src/timeFormat.js` | Time formatting and parsing |
| `src/sampleRecords.js` | Fake data in the real schema |
| `src/components/` | TransportBar, OverviewStrip, TimelineTracks, ViewControls, ActivityPanel, Toast |
