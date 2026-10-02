import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps a <canvas> sized to its container (sharp on high-density screens)
 * and redraws it with the latest `draw` function.
 *
 * It redraws after every React render (props changed) and keeps redrawing
 * every frame for as long as `draw` returns true (an animation is running).
 * Otherwise it sits idle.
 *
 * draw(ctx, widthInCssPixels, now) => boolean
 */
export function useCanvas({ height, draw }) {
  const canvasRef = useRef(null);
  const widthRef = useRef(0);
  const drawRef = useRef(draw);
  const needsRedrawRef = useRef(true);

  // After every render: pick up the newest draw function and schedule a redraw.
  useEffect(() => {
    drawRef.current = draw;
    needsRedrawRef.current = true;
  });

  // Match the canvas's pixel buffer to its on-screen size.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas.parentElement;

    const resize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      widthRef.current = width;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      needsRedrawRef.current = true;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  // The render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationIsRunning = false;
    let frameId;

    const renderFrame = (now) => {
      if (needsRedrawRef.current || animationIsRunning) {
        needsRedrawRef.current = false;
        const pixelRatio = canvas.width / Math.max(1, widthRef.current);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        animationIsRunning = Boolean(drawRef.current(ctx, widthRef.current, now));
      }
      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return { canvasRef, widthRef };
}
