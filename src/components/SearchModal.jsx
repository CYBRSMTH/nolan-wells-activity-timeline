import { useEffect, useRef, useState } from 'react';
import { colorForGroup } from '../theme';
import { formatClockTime, formatDateLabel } from '../timeFormat';
import { CloseIcon } from './Icons';

function highlightMatches(text, terms) {
  if (!text || !terms || terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function SearchModal({ isOpen, onClose, query, onQueryChange, results, eventsById, onSelectEvent, colors }) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [results]);

  function handleKeyDown(event) {
    if (event.key === 'Escape') { onClose(); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault();
      selectResult(results[focusedIndex]);
    }
  }

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  function selectResult(result) {
    const event = eventsById.get(result.id);
    if (!event) return;
    onSelectEvent(event);
    onClose();
  }

  const queryTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (!isOpen) return null;

  return (
    <>
      <div className="search-backdrop" onClick={onClose} />
      <div className="search-modal" role="dialog" aria-label="Search records" onKeyDown={handleKeyDown}>
        <div className="search-modal-header">
          <SearchInput ref={inputRef} value={query} onChange={onQueryChange} />
          <button type="button" className="button icon-button" onClick={onClose} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>

        <div className="search-results" ref={listRef}>
          {query.trim() === '' && (
            <p className="search-empty">Type to search records…</p>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <p className="search-empty">No results for "{query}"</p>
          )}
          {results.map((result, i) => {
            const event = eventsById.get(result.id);
            if (!event) return null;
            const color = colorForGroup(colors, event.groupIndex);
            return (
              <button
                key={result.id}
                type="button"
                className={`search-result-row${i === focusedIndex ? ' focused' : ''}`}
                onClick={() => selectResult(result)}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                <div className="search-result-meta">
                  <span className="search-result-time">
                    {formatDateLabel(event.time)} {formatClockTime(event.time)}
                  </span>
                  <span className="search-result-group">
                    <span className="search-result-swatch" style={{ background: color }} />
                    {event.groupName}
                  </span>
                  <span className="search-result-status">{event.status}</span>
                </div>
                {event.recordText && (
                  <div className="search-result-snippet">
                    {highlightMatches(event.recordText, queryTerms)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

const SearchInput = ({ value, onChange, ref }) => (
  <input
    ref={ref}
    type="search"
    className="search-input"
    placeholder="Search records…"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    autoComplete="off"
    spellCheck={false}
  />
);
