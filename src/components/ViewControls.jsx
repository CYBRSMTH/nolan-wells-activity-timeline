import { formatClockTime, formatDuration, formatShortDate } from '../timeFormat';

/** Marker legend, what's on screen, and the zoom buttons. */
export default function ViewControls({ visibleRange, canZoomOut, onZoomOut, onFitAll }) {
  return (
    <div className="view-controls">
      <MarkerLegend />
      <span className="visible-span">
        Showing {formatDuration(visibleRange.end - visibleRange.start)} from {formatShortDate(visibleRange.start)}{' '}
        {formatClockTime(visibleRange.start)}
      </span>
      <div className="zoom-buttons">
        <button type="button" className="button small" onClick={onZoomOut} disabled={!canZoomOut} title="Zoom out (-)">
          Zoom out
        </button>
        <button type="button" className="button small" onClick={onFitAll} title="Fit all (0)">
          Fit all
        </button>
      </div>
    </div>
  );
}

// Keep in sync with markerStyleFor() in drawTimeline.js.
function MarkerLegend() {
  return (
    <ul className="legend" aria-label="Marker legend">
      <li>
        <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2 12 7 7 12 2 7z" className="legend-hollow" /></svg>
        Received
      </li>
      <li>
        <svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="3" width="8" height="8" className="legend-hollow" /></svg>
        Opened
      </li>
      <li>
        <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="4" className="legend-hollow" /></svg>
        Sent
      </li>
    </ul>
  );
}
