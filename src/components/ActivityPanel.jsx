import { useMemo } from 'react';
import { colorForGroup } from '../theme';
import { formatClockTime, formatDateLabel, formatDuration } from '../timeFormat';

const MAX_LIST_ROWS = 100;
const ARRIVAL_HIGHLIGHT_MS = 900;

/**
 * Left: the activity list, newest first, showing everything up to the playhead.
 * Right: full details for the selected activity, or the latest one at the
 * playhead when nothing is selected, so it updates live during playback.
 */
export default function ActivityPanel({ data, passedCount, selectedEvent, onSelectEvent, colors, pulseTracker }) {
  const recentEvents = useMemo(
    () => data.events.slice(Math.max(0, passedCount - MAX_LIST_ROWS), passedCount).reverse(),
    [data, passedCount],
  );
  const eventInDetails = selectedEvent ?? data.events[passedCount - 1] ?? null;
  const now = performance.now();

  return (
    <section className="panel activity-panel">
      <div className="activity-list-column">
        <h2 className="panel-heading">
          Activity up to the playhead
          <span className="heading-count">
            {passedCount.toLocaleString()} of {data.events.length.toLocaleString()}
          </span>
        </h2>
        <ol className="activity-list">
          {recentEvents.length === 0 && (
            <li className="empty-message">Nothing yet. Press play, or tap a track to move the playhead.</li>
          )}
          {recentEvents.map((event) => (
            <ActivityRow
              key={event.id}
              event={event}
              groupColor={colorForGroup(colors, event.groupIndex)}
              isSelected={event === selectedEvent}
              justArrived={pulseTracker.firedWithin(event.id, now, ARRIVAL_HIGHLIGHT_MS)}
              onSelect={onSelectEvent}
            />
          ))}
        </ol>
      </div>

      <EventDetails
        event={eventInDetails}
        isPinned={Boolean(selectedEvent)}
        groupColor={eventInDetails ? colorForGroup(colors, eventInDetails.groupIndex) : undefined}
        onUnpin={() => onSelectEvent(null)}
      />
    </section>
  );
}

function ActivityRow({ event, groupColor, isSelected, justArrived, onSelect }) {
  const classNames = ['activity-row', isSelected && 'selected', justArrived && 'just-arrived'].filter(Boolean).join(' ');
  return (
    <li>
      <button type="button" className={classNames} style={{ '--group-color': groupColor }} onClick={() => onSelect(event)}>
        <span className="row-time">{formatClockTime(event.time)}</span>
        <span className="row-group">{event.groupName}</span>
        <span className="row-record">{event.recordText}</span>
      </button>
    </li>
  );
}

function EventDetails({ event, isPinned, groupColor, onUnpin }) {
  if (!event) {
    return <aside className="event-details empty-message">Press play or tap a marker to see its full record here.</aside>;
  }

  const delayMs = event.recordTime !== null ? event.time - event.recordTime : null;

  return (
    <aside className="event-details" style={{ '--group-color': groupColor }}>
      <div className="details-header">
        <span className="details-group">{event.groupName}</span>
        {isPinned ? (
          <button type="button" className="button small" onClick={onUnpin} title="Unpin (Esc)">
            Unpin
          </button>
        ) : (
          <span className="details-note">Latest at playhead</span>
        )}
      </div>

      <dl className="details-grid">
        <dt>Status</dt>
        <dd>{event.status || 'Unknown'}</dd>

        <dt>Activity</dt>
        <dd>
          {formatDateLabel(event.time)} {formatClockTime(event.time)}
        </dd>

        <dt>Recorded</dt>
        <dd>
          {event.recordTime !== null ? (
            <>
              {formatClockTime(event.recordTime)} <span className="muted">({formatDuration(delayMs)} before activity)</span>
            </>
          ) : (
            'Unknown'
          )}
        </dd>

        <dt>Viewed</dt>
        <dd>{event.wasViewed ? 'Yes' : 'No'}</dd>

        <dt>Saved</dt>
        <dd>{event.wasSaved ? 'Yes' : 'No'}</dd>

        <dt>IDs</dt>
        <dd className="details-ids">
          rowid {event.rowId}, cmid {event.cmid}, smid {event.smid}
        </dd>
      </dl>

      <h3 className="record-heading">Record</h3>
      <pre className="record-text">{event.recordText || '(empty)'}</pre>
    </aside>
  );
}
