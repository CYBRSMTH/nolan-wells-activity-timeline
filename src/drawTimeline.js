// Everything that paints pixels. Each function takes a canvas context plus
// plain data and draws the whole picture from scratch; nothing is remembered
// between frames.

import { formatAxisLabel, formatDuration, isLocalMidnight } from './timeFormat';
import { countEventsAtOrBefore, indexOfFirstEventAtOrAfter } from './timelineData';
import { chooseAxisTicks, clamp, createTimeScale, rowCenterY } from './timelineGeometry';
import { colorForGroup } from './theme';

const FONT_FAMILY = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const FUTURE_EVENT_OPACITY = 0.35; // events the playhead hasn't reached yet
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * How one event's marker looks. Change this to change the visual encoding.
 *   filled diamond = viewed and saved
 *   hollow diamond = viewed, not saved
 *   small circle   = not viewed
 */
export function markerStyleFor(event) {
  if (!event.wasViewed) return { shape: 'circle', size: 3.5, filled: false };
  return { shape: 'diamond', size: event.wasSaved ? 5.5 : 5, filled: event.wasSaved };
}

function traceMarkerPath(ctx, shape, x, y, size) {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x, y, size, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}

function drawMarker(ctx, event, x, y, groupColor, colors) {
  const { shape, size, filled } = markerStyleFor(event);
  traceMarkerPath(ctx, shape, x, y, size);
  if (filled) {
    ctx.fillStyle = groupColor;
    ctx.fill();
    return;
  }
  ctx.fillStyle = colors.surface;
  ctx.fill();
  ctx.strokeStyle = groupColor;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}…`;
}

/* ------------------------------------------------------------------ */
/* Main tracks                                                         */
/* ------------------------------------------------------------------ */

/** Draws the full tracks view. Returns true while any pulse is still animating. */
export function drawTracks(ctx, { layout, data, visibleRange, playheadTime, colors, pulseTracker, hoveredEvent, selectedEvent, selectionBox, now }) {
  const scale = createTimeScale(visibleRange, layout.tracksLeft, layout.tracksRight);

  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawGridAndAxis(ctx, layout, visibleRange, scale, colors);
  if (selectionBox) drawSelectionBox(ctx, layout, selectionBox, scale, colors);

  let pulsesStillRunning = false;
  data.groupNames.forEach((groupName, groupIndex) => {
    const rowHasPulses = drawGroupRow(ctx, {
      layout, data, groupIndex, visibleRange, scale, playheadTime, colors, pulseTracker, hoveredEvent, selectedEvent, now,
    });
    pulsesStillRunning = pulsesStillRunning || rowHasPulses;
  });

  drawPlayhead(ctx, layout, scale.timeToX(playheadTime), colors);
  return pulsesStillRunning;
}

function drawGridAndAxis(ctx, layout, visibleRange, scale, colors) {
  const { tracksLeft, tracksRight, rulerHeight, axisTop, height, width, isNarrow } = layout;
  const ticks = chooseAxisTicks(visibleRange, tracksRight - tracksLeft, isNarrow);

  ctx.save();
  ctx.beginPath();
  ctx.rect(tracksLeft, 0, tracksRight - tracksLeft, height);
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const time of ticks.times) {
    const x = Math.round(scale.timeToX(time)) + 0.5;
    const isDayBoundary = ticks.spacing < 86400000 && isLocalMidnight(time);

    ctx.strokeStyle = isDayBoundary ? colors.line : colors.grid;
    ctx.beginPath();
    ctx.moveTo(x, rulerHeight);
    ctx.lineTo(x, axisTop);
    ctx.stroke();

    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.moveTo(x, axisTop);
    ctx.lineTo(x, axisTop + 5);
    ctx.stroke();

    const labelFitsInside = x > tracksLeft + 26 && x < tracksRight - 26;
    if (labelFitsInside) {
      ctx.font = `${isDayBoundary ? 500 : 400} 12px ${FONT_FAMILY}`;
      ctx.fillStyle = isDayBoundary ? colors.text : colors.mutedText;
      ctx.fillText(formatAxisLabel(time, ticks.spacing), x, axisTop + 17);
    }
  }
  ctx.restore();

  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  ctx.moveTo(tracksLeft, axisTop + 0.5);
  ctx.lineTo(tracksRight, axisTop + 0.5);
  ctx.stroke();

  ctx.strokeStyle = colors.grid;
  ctx.beginPath();
  ctx.moveTo(0, rulerHeight + 0.5);
  ctx.lineTo(width, rulerHeight + 0.5);
  ctx.stroke();
}

function drawSelectionBox(ctx, layout, selectionBox, scale, colors) {
  const left = Math.min(selectionBox.fromX, selectionBox.toX);
  const right = Math.max(selectionBox.fromX, selectionBox.toX);
  const { rulerHeight, axisTop } = layout;

  ctx.fillStyle = colors.selection;
  ctx.fillRect(left, rulerHeight, right - left, axisTop - rulerHeight);

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(left + 0.5, rulerHeight);
  ctx.lineTo(left + 0.5, axisTop);
  ctx.moveTo(right - 0.5, rulerHeight);
  ctx.lineTo(right - 0.5, axisTop);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.accent;
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatDuration(scale.xToTime(right) - scale.xToTime(left)), (left + right) / 2, rulerHeight / 2);
}

function drawGroupRow(ctx, { layout, data, groupIndex, visibleRange, scale, playheadTime, colors, pulseTracker, hoveredEvent, selectedEvent, now }) {
  const { tracksLeft, tracksRight, rulerHeight, axisTop } = layout;
  const y = rowCenterY(layout, groupIndex);
  const groupColor = colorForGroup(colors, groupIndex);

  // Label in the left column
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = groupColor;
  traceMarkerPath(ctx, 'diamond', 16, y, 4.5);
  ctx.fill();
  ctx.fillStyle = colors.text;
  ctx.font = `500 13px ${FONT_FAMILY}`;
  ctx.fillText(truncateToWidth(ctx, data.groupNames[groupIndex], tracksLeft - 40), 28, y);

  // The track line itself
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tracksLeft, y);
  ctx.lineTo(tracksRight, y);
  ctx.stroke();

  // Only loop over events in (or just outside) the visible window.
  const groupEvents = data.eventsByGroup[groupIndex];
  const margin = (visibleRange.end - visibleRange.start) * 0.01;
  const firstVisibleIndex = indexOfFirstEventAtOrAfter(groupEvents, visibleRange.start - margin);
  const endVisibleIndex = countEventsAtOrBefore(groupEvents, visibleRange.end + margin);

  ctx.save();
  ctx.beginPath();
  ctx.rect(tracksLeft - 10, rulerHeight, tracksRight - tracksLeft + 20, axisTop - rulerHeight);
  ctx.clip();

  let rowHasPulses = false;
  for (let index = firstVisibleIndex; index < endVisibleIndex; index += 1) {
    const event = groupEvents[index];
    const x = scale.timeToX(event.time);

    const pulseProgress = reducedMotionQuery.matches ? null : pulseTracker.pulseProgress(event.id, now);
    if (pulseProgress !== null) {
      rowHasPulses = true;
      ctx.globalAlpha = (1 - pulseProgress) * 0.9;
      ctx.strokeStyle = groupColor;
      ctx.lineWidth = 2;
      traceMarkerPath(ctx, 'diamond', x, y, 7 + pulseProgress * 16);
      ctx.stroke();
    }

    ctx.globalAlpha = event.time <= playheadTime ? 1 : FUTURE_EVENT_OPACITY;
    drawMarker(ctx, event, x, y, groupColor, colors);
  }
  ctx.globalAlpha = 1;

  if (selectedEvent && selectedEvent.groupIndex === groupIndex) {
    drawSelectedEvent(ctx, selectedEvent, y, scale, groupColor, colors);
  }
  if (hoveredEvent && hoveredEvent.groupIndex === groupIndex && hoveredEvent !== selectedEvent) {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1.5;
    traceMarkerPath(ctx, 'diamond', scale.timeToX(hoveredEvent.time), y, 10);
    ctx.stroke();
  }

  ctx.restore();
  return rowHasPulses;
}

/** Highlight ring, plus a bracket from when the record was created to when it was opened. */
function drawSelectedEvent(ctx, event, y, scale, groupColor, colors) {
  const x = scale.timeToX(event.time);

  if (event.recordTime !== null) {
    const recordX = scale.timeToX(event.recordTime);
    const bracketY = y - 15;

    ctx.strokeStyle = groupColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(recordX, y - 4);
    ctx.lineTo(recordX, bracketY);
    ctx.lineTo(x, bracketY);
    ctx.lineTo(x, y - 8);
    ctx.stroke();

    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(recordX, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const label = `${formatDuration(event.time - event.recordTime)} after recorded`;
    ctx.font = `500 11px ${FONT_FAMILY}`;
    if (Math.abs(x - recordX) > ctx.measureText(label).width + 12) {
      ctx.fillStyle = groupColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, (x + recordX) / 2, bracketY - 2);
    }
  }

  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1.5;
  traceMarkerPath(ctx, 'diamond', x, y, 10);
  ctx.stroke();
}

function drawPlayhead(ctx, layout, playheadX, colors) {
  const { tracksLeft, tracksRight, rulerHeight, axisTop } = layout;
  const isOnScreen = playheadX >= tracksLeft - 1 && playheadX <= tracksRight + 1;

  if (isOnScreen) {
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, rulerHeight - 4);
    ctx.lineTo(playheadX, axisTop);
    ctx.stroke();

    // Handle: a small pointer shape in the ruler strip
    ctx.fillStyle = colors.playhead;
    ctx.beginPath();
    ctx.moveTo(playheadX - 7, 4);
    ctx.lineTo(playheadX + 7, 4);
    ctx.lineTo(playheadX + 7, rulerHeight - 11);
    ctx.lineTo(playheadX, rulerHeight - 4);
    ctx.lineTo(playheadX - 7, rulerHeight - 11);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Off screen: an arrow at the edge pointing toward it
  const isOffLeft = playheadX < tracksLeft;
  const edgeX = isOffLeft ? tracksLeft + 2 : tracksRight - 2;
  const direction = isOffLeft ? 1 : -1;
  const centerY = rulerHeight / 2;

  ctx.fillStyle = colors.mutedText;
  ctx.beginPath();
  ctx.moveTo(edgeX, centerY);
  ctx.lineTo(edgeX + 9 * direction, centerY - 6);
  ctx.lineTo(edgeX + 9 * direction, centerY + 6);
  ctx.closePath();
  ctx.fill();

  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = isOffLeft ? 'left' : 'right';
  ctx.fillText('Playhead', edgeX + 14 * direction, centerY);
}

/* ------------------------------------------------------------------ */
/* Overview strip                                                      */
/* ------------------------------------------------------------------ */

/**
 * The miniature "barcode" of every event. It never changes while you play or
 * zoom, so it's drawn once into an offscreen canvas and pasted each frame.
 */
export function renderOverviewBarcode({ data, colors, layout, fullRange }) {
  const pixelRatio = window.devicePixelRatio || 1;
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(layout.width * pixelRatio);
  offscreen.height = Math.round(layout.height * pixelRatio);

  const ctx = offscreen.getContext('2d');
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.fillStyle = colors.mutedText;
  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Full range', 14, layout.height / 2);

  const scale = createTimeScale(fullRange, layout.left, layout.right);
  const bandHeight = (layout.height - 10) / Math.max(data.groupNames.length, 1);

  for (const event of data.events) {
    ctx.fillStyle = colorForGroup(colors, event.groupIndex);
    ctx.globalAlpha = event.wasSaved ? 1 : 0.55;
    ctx.fillRect(Math.round(scale.timeToX(event.time)), 5 + event.groupIndex * bandHeight + 0.5, 1.5, Math.max(2, bandHeight - 1));
  }
  ctx.globalAlpha = 1;
  return offscreen;
}

export function drawOverview(ctx, { layout, barcode, fullRange, visibleRange, playheadTime, colors }) {
  const { width, height, left, right } = layout;
  const scale = createTimeScale(fullRange, left, right);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(barcode, 0, 0, width, height);

  const windowStartX = clamp(scale.timeToX(visibleRange.start), left, right);
  const windowEndX = clamp(scale.timeToX(visibleRange.end), left, right);

  // Dim everything outside the visible window so the window looks "lit".
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = colors.surface;
  ctx.fillRect(left - 4, 0, windowStartX - left + 4, height);
  ctx.fillRect(windowEndX, 0, right - windowEndX + 4, height);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(windowStartX + 0.75, 1.5, Math.max(3, windowEndX - windowStartX) - 1.5, height - 3);

  // Grab handles on each edge
  ctx.fillStyle = colors.accent;
  ctx.fillRect(windowStartX - 1, height / 2 - 7, 3, 14);
  ctx.fillRect(windowEndX - 2, height / 2 - 7, 3, 14);

  const playheadX = scale.timeToX(playheadTime);
  ctx.strokeStyle = colors.playhead;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, height);
  ctx.stroke();
}
