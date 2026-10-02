import { useCallback, useEffect, useRef, useState } from 'react';

const VISIBLE_FOR_MS = 1800;
const MIN_GAP_BETWEEN_TOASTS_MS = 900;

/** A small status message at the bottom of the screen. */
export function useToast() {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const lastShownAtRef = useRef(0);
  const hideTimerRef = useRef(null);

  const showToast = useCallback((text) => {
    const now = performance.now();
    if (now - lastShownAtRef.current < MIN_GAP_BETWEEN_TOASTS_MS) return;
    lastShownAtRef.current = now;
    setMessage(text);
    setIsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setIsVisible(false), VISIBLE_FOR_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  return { message, isVisible, showToast };
}

export default function Toast({ message, isVisible }) {
  return (
    <div className={`toast ${isVisible ? 'visible' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
