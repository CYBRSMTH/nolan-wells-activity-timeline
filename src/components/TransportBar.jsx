import { useState } from 'react';
import { formatClockTime, formatDateLabel } from '../timeFormat';
import { CheckIcon, FunnelIcon, NextIcon, PreviousIcon, ShareIcon } from './Icons';

export default function TransportBar({
  playheadTime,
  passedCount,
  totalCount,
  onStepBackward,
  onStepForward,
  onToggleFilterDrawer,
  filterActive,
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

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
      </div>
    </div>
  );
}
