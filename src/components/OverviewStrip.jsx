import { useRef } from 'react';
import { useCanvas } from '../useCanvas';
import { drawOverview, renderOverviewBarcode } from '../drawTimeline';
import { MIN_VISIBLE_SPAN_MS, clamp, createTimeScale, getOverviewLayout } from '../timelineGeometry';

const EDGE_GRAB_DISTANCE_PX = { mouse: 7, touch: 14 };
const TAP_DISTANCE_PX = 3;

/**
 * The thin strip showing the whole dataset. The lit window marks what the
 * tracks below are showing. Drag inside it to pan, drag its edges to resize,
 * or drag anywhere else to draw a new window.
 */
export default function OverviewStrip({ data, colors, fullRange, visibleRange, playheadTime, onChangeRange, onRememberRange }) {
  const height = clamp(10 + data.groupNames.length * 7, 40, 64);
  const barcodeCacheRef = useRef({ data: null, colors: null, width: 0, image: null });
  const dragRef = useRef(null);

  const { canvasRef, widthRef } = useCanvas({
    height,
    draw: (ctx, width) => {
      const layout = getOverviewLayout(width, height);
      const cache = barcodeCacheRef.current;
      if (cache.data !== data || cache.colors !== colors || cache.width !== width) {
        barcodeCacheRef.current = { data, colors, width, image: renderOverviewBarcode({ data, colors, layout, fullRange }) };
      }
      drawOverview(ctx, { layout, barcode: barcodeCacheRef.current.image, fullRange, visibleRange, playheadTime, colors });
      return false;
    },
  });

  function measure(pointerEvent) {
    const rect = canvasRef.current.getBoundingClientRect();
    const layout = getOverviewLayout(widthRef.current, height);
    const scale = createTimeScale(fullRange, layout.left, layout.right);
    const x = pointerEvent.clientX - rect.left;
    return { x, layout, scale, timeAtPointer: scale.xToTime(clamp(x, layout.left, layout.right)) };
  }

  function whatIsUnderPointer(x, scale, pointerType) {
    const grabDistance = EDGE_GRAB_DISTANCE_PX[pointerType] ?? EDGE_GRAB_DISTANCE_PX.mouse;
    const windowStartX = scale.timeToX(visibleRange.start);
    const windowEndX = scale.timeToX(visibleRange.end);
    if (Math.abs(x - windowStartX) < grabDistance && x < windowEndX) return 'startEdge';
    if (Math.abs(x - windowEndX) < grabDistance) return 'endEdge';
    if (x > windowStartX && x < windowEndX) return 'window';
    return 'outside';
  }

  function handlePointerDown(event) {
    const { x, scale, timeAtPointer } = measure(event);
    const target = whatIsUnderPointer(x, scale, event.pointerType);
    const modeByTarget = { startEdge: 'resizingStart', endEdge: 'resizingEnd', window: 'moving', outside: 'drawing' };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = target === 'window' ? 'grabbing' : 'ew-resize';
    dragRef.current = {
      mode: modeByTarget[target],
      rangeBefore: visibleRange,
      grabOffsetMs: timeAtPointer - visibleRange.start,
      anchorTime: timeAtPointer,
      startX: x,
      hasMoved: false,
      changedRange: false,
    };
  }

  function handlePointerMove(event) {
    const { x, scale, timeAtPointer } = measure(event);
    const drag = dragRef.current;

    if (!drag) {
      const target = whatIsUnderPointer(x, scale, event.pointerType);
      event.currentTarget.style.cursor = { startEdge: 'ew-resize', endEdge: 'ew-resize', window: 'grab', outside: 'crosshair' }[target];
      return;
    }

    if (Math.abs(x - drag.startX) > TAP_DISTANCE_PX) drag.hasMoved = true;
    const { rangeBefore } = drag;
    const spanBefore = rangeBefore.end - rangeBefore.start;

    const changeRange = (range) => {
      drag.changedRange = true;
      onChangeRange(range);
    };

    if (drag.mode === 'resizingStart') {
      changeRange({ start: Math.min(timeAtPointer, rangeBefore.end - MIN_VISIBLE_SPAN_MS), end: rangeBefore.end });
    } else if (drag.mode === 'resizingEnd') {
      changeRange({ start: rangeBefore.start, end: Math.max(timeAtPointer, rangeBefore.start + MIN_VISIBLE_SPAN_MS) });
    } else if (drag.mode === 'moving') {
      const start = scale.xToTime(x) - drag.grabOffsetMs;
      changeRange({ start, end: start + spanBefore });
    } else if (drag.mode === 'drawing' && drag.hasMoved) {
      changeRange({ start: Math.min(drag.anchorTime, timeAtPointer), end: Math.max(drag.anchorTime, timeAtPointer) });
    }
  }

  function handlePointerUp(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const { timeAtPointer } = measure(event);

    // A tap outside the window moves the window there.
    if (drag.mode === 'drawing' && !drag.hasMoved) {
      const halfSpan = (drag.rangeBefore.end - drag.rangeBefore.start) / 2;
      onChangeRange({ start: timeAtPointer - halfSpan, end: timeAtPointer + halfSpan });
      drag.changedRange = true;
    }
    // Only add to the zoom history if the window actually changed.
    if (drag.changedRange) onRememberRange(drag.rangeBefore);
    dragRef.current = null;
    event.currentTarget.style.cursor = 'grab';
  }

  return (
    <div className="overview-stage">
      <canvas
        ref={canvasRef}
        className="overview-canvas"
        aria-label="Full time range. Drag to choose the span shown in the tracks below."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      />
    </div>
  );
}
