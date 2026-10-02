import { formatClockTime, formatDateLabel } from '../timeFormat';
import { PLAYBACK_SPEEDS, describeSpeed } from '../usePlayback';
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from './Icons';

/** Clock readout, play controls, speed and playback options. */
export default function TransportBar({
  playheadTime,
  passedCount,
  totalCount,
  isPlaying,
  onTogglePlay,
  onStepBackward,
  onStepForward,
  playbackSpeed,
  onChangeSpeed,
  skipQuietGaps,
  onChangeSkipQuietGaps,
  followPlayhead,
  onChangeFollowPlayhead,
}) {
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
          <button
            type="button"
            className="button primary play-button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className="button icon-button" onClick={onStepForward} aria-label="Next activity" title="Next activity (→)">
            <NextIcon />
          </button>
        </div>

        <label className="speed-picker">
          Speed
          <select value={playbackSpeed} onChange={(event) => onChangeSpeed(Number(event.target.value))} title="Playback speed ([ and ])">
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {describeSpeed(speed)}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={skipQuietGaps} onChange={(event) => onChangeSkipQuietGaps(event.target.checked)} />
          Skip quiet gaps
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={followPlayhead} onChange={(event) => onChangeFollowPlayhead(event.target.checked)} />
          Follow playhead
        </label>
      </div>
    </div>
  );
}
