import { useEffect, useRef, useState } from 'react';
import { useCanvas } from '../useCanvas';
import { drawTracks } from '../drawTimeline';
import { clamp, createTimeScale, findEventNear, getTrackLayout } from '../timelineGeometry';
import { colorForGroup } from '../theme';
import { formatClockTime } from '../timeFormat';

const DRAG_THRESHOLD_PX = 6; // movement before a press becomes a drag-to-zoom
const MIN_ZOOM_SELECTION_PX = 8;
const PLAYHEAD_GRAB_DISTANCE_PX = { mouse: 7, touch: 16 };
const EVENT_HIT_DISTANCE_PX = { mouse: 8, touch: 14 };
const TOUCH_TOOLTIP_MS = 2600;

/**
 * The stacked group tracks with markers and the playhead.
 *
 * Interactions:
 *   drag sideways across the tracks   → zoom into that span
 *   tap a marker                      → select it
 *   tap empty track                   → move the playhead there
 *   drag the handle or the ruler      → scrub the playhead
 *   Ctrl/⌘ + scroll                   → zoom; sideways scroll pans
 */
export default function TimelineTracks({
  data,
  colors,
  visibleRange,
  playheadTime,
  pulseTracker,
  selectedEvent,
  onSeek,
  onSelectEvent,
  onZoomToRange,
  onZoomAround,
  onPanBy,
}) {
  const groupCount = data.groupNames.length;
  const canvasHeight = getTrackLayout(0, groupCount).height;

  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null); // { fromX, toX } while dragging to zoom
  const [tooltip, setTooltip] = useState(null); // { event, x, y }
  const dragRef = useRef(null);
  const tooltipTimerRef = useRef(null);

  const { canvasRef, widthRef } = useCanvas({
    height: canvasHeight,
    draw: (ctx, width, now) =>
      drawTracks(ctx, {
        layout: getTrackLayout(width, groupCount),
        data,
        visibleRange,
        playheadTime,
        colors,
        pulseTracker,
        hoveredEvent,
        selectedEvent,
        selectionBox,
        now,
      }),
  });

  /** Layout, time scale and pointer position for the canvas as it's sized right now. */
  function measure(pointerEvent) {
    const rect = canvasRef.current.getBoundingClientRect();
    const layout = getTrackLayout(widthRef.current, groupCount);
    const scale = createTimeScale(visibleRange, layout.tracksLeft, layout.tracksRight);
    const x = pointerEvent.clientX - rect.left;
    const y = pointerEvent.clientY - rect.top;
    const timeAtPointer = scale.xToTime(clamp(x, layout.tracksLeft, layout.tracksRight));
    return { layout, scale, x, y, timeAtPointer };
  }

  function showTooltip(event, x, y, autoHideAfterMs) {
    clearTimeout(tooltipTimerRef.current);
    setTooltip({ event, x, y });
    if (autoHideAfterMs) tooltipTimerRef.current = setTimeout(() => setTooltip(null), autoHideAfterMs);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimerRef.current);
    setTooltip(null);
  }

  function handlePointerDown(event) {
    const { layout, scale, x, y, timeAtPointer } = measure(event);
    if (x < layout.tracksLeft - 6) return; // the label column isn't interactive

    const grabDistance = PLAYHEAD_GRAB_DISTANCE_PX[event.pointerType] ?? PLAYHEAD_GRAB_DISTANCE_PX.mouse;
    const isGrabbingPlayhead = y < layout.rulerHeight || Math.abs(x - scale.timeToX(playheadTime)) < grabDistance;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode: isGrabbingPlayhead ? 'scrubbing' : 'undecided', startX: x, pointerType: event.pointerType };

    if (isGrabbingPlayhead) {
      hideTooltip();
      onSeek(timeAtPointer);
    }
  }

  function handlePointerMove(event) {
    const { layout, scale, x, y, timeAtPointer } = measure(event);
    const drag = dragRef.current;

    // Just hovering with a mouse: highlight the marker under the pointer.
    if (!drag) {
      if (event.pointerType !== 'mouse') return;
      const eventUnderPointer = findEventNear(data, layout, scale, x, y, EVENT_HIT_DISTANCE_PX.mouse);
      setHoveredEvent(eventUnderPointer);
      if (eventUnderPointer) showTooltip(eventUnderPointer, x, y);
      else hideTooltip();

      const nearPlayhead = y < layout.rulerHeight || Math.abs(x - scale.timeToX(playheadTime)) < PLAYHEAD_GRAB_DISTANCE_PX.mouse;
      event.currentTarget.style.cursor = x < layout.tracksLeft - 6 ? 'default' : nearPlayhead ? 'ew-resize' : eventUnderPointer ? 'pointer' : 'crosshair';
      return;
    }

    if (drag.mode === 'scrubbing') {
      onSeek(timeAtPointer);
      return;
    }

    if (drag.mode === 'undecided' && Math.abs(x - drag.startX) > DRAG_THRESHOLD_PX) {
      drag.mode = 'selecting';
      hideTooltip();
    }

    if (drag.mode === 'selecting') {
      const clampX = (value) => clamp(value, layout.tracksLeft, layout.tracksRight);
      drag.selection = { fromX: clampX(drag.startX), toX: clampX(x) };
      setSelectionBox(drag.selection);
    }
  }

  function handlePointerUp(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const { layout, scale, x, y, timeAtPointer } = measure(event);

    if (drag.mode === 'selecting' && drag.selection) {
      const left = Math.min(drag.selection.fromX, drag.selection.toX);
      const right = Math.max(drag.selection.fromX, drag.selection.toX);
      if (right - left > MIN_ZOOM_SELECTION_PX) onZoomToRange({ start: scale.xToTime(left), end: scale.xToTime(right) });
      setSelectionBox(null);
    } else if (drag.mode === 'undecided') {
      // It was a tap or click, not a drag.
      const hitDistance = EVENT_HIT_DISTANCE_PX[drag.pointerType] ?? EVENT_HIT_DISTANCE_PX.mouse;
      const tappedEvent = findEventNear(data, layout, scale, x, y, hitDistance);
      if (tappedEvent) {
        onSelectEvent(tappedEvent);
        if (drag.pointerType !== 'mouse') showTooltip(tappedEvent, scale.timeToX(tappedEvent.time), y, TOUCH_TOOLTIP_MS);
      } else {
        onSelectEvent(null);
        onSeek(timeAtPointer);
        hideTooltip();
      }
    }

    dragRef.current = null;
  }

  function handlePointerCancel() {
    dragRef.current = null;
    setSelectionBox(null);
  }

  function handlePointerLeave(event) {
    if (event.pointerType === 'mouse' && !dragRef.current) {
      setHoveredEvent(null);
      hideTooltip();
    }
  }

  // Plain scrolling is left alone so the page still scrolls.
  // Ctrl/⌘ + scroll (and trackpad pinch) zooms; sideways scroll pans.
  function handleWheel(event) {
    const { layout, timeAtPointer } = measure(event);
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      onZoomAround(timeAtPointer, Math.exp(clamp(event.deltaY, -40, 40) * 0.01));
    } else if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
      const scrollPixels = event.shiftKey ? event.deltaY : event.deltaX;
      const msPerPixel = (visibleRange.end - visibleRange.start) / (layout.tracksRight - layout.tracksLeft);
      onPanBy(scrollPixels * msPerPixel);
    }
  }

  // React registers wheel listeners as passive, which means preventDefault()
  // is ignored. We attach our own so zooming doesn't also scroll the page.
  const wheelHandlerRef = useRef(handleWheel);
  wheelHandlerRef.current = handleWheel;
  useEffect(() => {
    const canvas = canvasRef.current;
    const listener = (event) => wheelHandlerRef.current(event);
    canvas.addEventListener('wheel', listener, { passive: false });
    return () => canvas.removeEventListener('wheel', listener);
  }, [canvasRef]);

  useEffect(() => () => clearTimeout(tooltipTimerRef.current), []);

  return (
    <div className="tracks-stage">
      <canvas
        ref={canvasRef}
        className="tracks-canvas"
        role="img"
        aria-label={`Activity tracks for ${data.groupNames.join(', ')}, with a playhead`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      />
      {tooltip && (
        <EventTooltip
          event={tooltip.event}
          x={tooltip.x}
          y={tooltip.y}
          containerWidth={widthRef.current}
          containerHeight={canvasHeight}
          groupColor={colorForGroup(colors, tooltip.event.groupIndex)}
        />
      )}
    </div>
  );
}

function EventTooltip({ event, x, y, containerWidth, containerHeight, groupColor }) {
  const halfWidth = 150;
  const left = containerWidth > halfWidth * 2 + 16 ? clamp(x, halfWidth + 8, containerWidth - halfWidth - 8) : containerWidth / 2;
  const placement = y < containerHeight / 2 ? 'below' : 'above';

  return (
    <div className={`tooltip ${placement}`} style={{ left, top: y, '--group-color': groupColor }}>
      <div className="tooltip-meta">
        {formatClockTime(event.time)} <strong>{event.groupName}</strong> {event.status}
      </div>
      <div className="tooltip-record">{event.recordText}</div>
    </div>
  );
}
