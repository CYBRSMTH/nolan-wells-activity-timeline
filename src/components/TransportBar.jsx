import { useEffect, useRef, useState } from 'react';
import { formatClockTime, formatDateLabel } from '../timeFormat';
import { CheckIcon, FunnelIcon, InfoIcon, NextIcon, PreviousIcon, SearchIcon, ShareIcon } from './Icons';

const SHORTCUTS = [
  { section: 'Navigate events' },
  { keys: '← →', desc: 'Step to previous / next event' },
  { keys: 'Click marker', desc: 'Select event and move playhead' },
  { keys: 'Click empty space', desc: 'Move playhead' },
  { section: 'Timeline view' },
  { keys: 'Ctrl + scroll', desc: 'Zoom in / out around cursor' },
  { keys: 'Shift + scroll', desc: 'Pan left / right' },
  { keys: 'Drag across tracks', desc: 'Zoom into that span' },
  { keys: '= / +', desc: 'Zoom in' },
  { keys: '-', desc: 'Zoom out' },
  { keys: '0', desc: 'Fit all events in view' },
  { section: 'General' },
  { keys: 'Ctrl/⌘ + F', desc: 'Search records' },
  { keys: 'Esc', desc: 'Clear selection / close panel' },
];

export default function TransportBar({
  playheadTime,
  passedCount,
  totalCount,
  onStepBackward,
  onStepForward,
  onToggleFilterDrawer,
  filterActive,
  onToggleSearch,
}) {
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Close help popover when clicking outside
  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [helpOpen]);

  return (
    <div className="transport">
      <div>
        <div className="clock">{formatClockTime(playheadTime)}</div>
        <div className="clock-details">
          <span>{formatDateLabel(playheadTime)}</span>
          <span>
            {passedCount.toLocaleString()} of {totalCount.toLocaleString()} activities
          </span>
        </div>
      </div>

      <div className="controls">
        <div className="transport-buttons">
          <button type="button" className="button icon-button" onClick={onStepBackward} aria-label="Previous activity" title="Previous activity (←)">
            <PreviousIcon />
          </button>
          <button type="button" className="button icon-button" onClick={onStepForward} aria-label="Next activity" title="Next activity (→)">
            <NextIcon />
          </button>
        </div>
        {onToggleSearch && (
          <button
            type="button"
            className="button icon-button"
            onClick={onToggleSearch}
            aria-label="Search records"
            title="Search records (Ctrl+F)"
          >
            <SearchIcon />
          </button>
        )}
        <button
          type="button"
          className={`button icon-button${filterActive ? ' primary' : ''}`}
          onClick={onToggleFilterDrawer}
          aria-label="Filter groups"
          title="Filter groups"
        >
          <FunnelIcon />
        </button>
        <button
          type="button"
          className={`button icon-button${copied ? ' success' : ''}`}
          onClick={handleShare}
          aria-label="Copy link"
          title="Copy link to current view"
        >
          {copied ? <CheckIcon /> : <ShareIcon />}
        </button>

        <div className="help-anchor" ref={helpRef}>
          <button
            type="button"
            className={`button icon-button${helpOpen ? ' primary' : ''}`}
            onClick={() => setHelpOpen((o) => !o)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
          >
            <InfoIcon />
          </button>
          {helpOpen && (
            <div className="help-popover" role="dialog" aria-label="Keyboard shortcuts">
              <div className="help-popover-title">Keyboard shortcuts</div>
              <table className="help-table">
                <tbody>
                  {SHORTCUTS.map((row, i) =>
                    row.section ? (
                      <tr key={i} className="help-section-row">
                        <td colSpan={2}>{row.section}</td>
                      </tr>
                    ) : (
                      <tr key={i}>
                        <td className="help-keys">{row.keys}</td>
                        <td className="help-desc">{row.desc}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
