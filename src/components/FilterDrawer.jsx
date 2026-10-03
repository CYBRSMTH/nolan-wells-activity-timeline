import { colorForGroup } from '../theme';
import { CloseIcon } from './Icons';

export default function FilterDrawer({
  isOpen,
  onClose,
  allGroupNames,
  visibleGroups,
  onChangeVisibleGroups,
  allStatuses,
  visibleStatuses,
  onChangeVisibleStatuses,
  showRecord,
  onChangeShowRecord,
  colors,
}) {
  const allGroupsVisible = visibleGroups.size === allGroupNames.length;
  const allStatusesVisible = visibleStatuses.size === allStatuses.length;

  const toggleGroup = (name) => {
    const next = new Set(visibleGroups);
    if (next.has(name)) {
      if (next.size > 1) next.delete(name);
    } else {
      next.add(name);
    }
    onChangeVisibleGroups(next);
  };

  const toggleStatus = (status) => {
    const next = new Set(visibleStatuses);
    if (next.has(status)) {
      if (next.size > 1) next.delete(status);
    } else {
      next.add(status);
    }
    onChangeVisibleStatuses(next);
  };

  return (
    <>
      {isOpen && <div className="filter-backdrop" onClick={onClose} />}
      <div className={`filter-drawer${isOpen ? ' open' : ''}`} aria-hidden={!isOpen}>
        <div className="filter-drawer-header">
          <span className="filter-drawer-title">Filters</span>
          <button type="button" className="button icon-button" onClick={onClose} aria-label="Close filter drawer">
            <CloseIcon />
          </button>
        </div>

        <div className="filter-section-heading filter-section-heading--first">Display</div>
        <ul className="filter-group-list">
          <li>
            <label className="filter-group-item">
              <input
                type="checkbox"
                checked={showRecord}
                onChange={(e) => onChangeShowRecord(e.target.checked)}
              />
              <span className="filter-group-name">Show record text</span>
            </label>
          </li>
        </ul>

        <div className="filter-section-heading">Activity Status</div>
        <ul className="filter-group-list">
          {allStatuses.map((status) => (
            <li key={status}>
              <label className="filter-group-item">
                <input
                  type="checkbox"
                  checked={visibleStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                />
                <span className="filter-group-name">{status || '(unknown)'}</span>
              </label>
            </li>
          ))}
        </ul>
        {!allStatusesVisible && (
          <div className="filter-section-reset">
            <button type="button" className="button small" onClick={() => onChangeVisibleStatuses(new Set(allStatuses))}>
              Show all
            </button>
          </div>
        )}

        <div className="filter-section-heading">Chat Groups</div>
        <div className="filter-drawer-actions">
          <button
            type="button"
            className="button small"
            onClick={() => onChangeVisibleGroups(new Set(allGroupNames))}
            disabled={allGroupsVisible}
          >
            Select all
          </button>
          <button
            type="button"
            className="button small"
            onClick={() => onChangeVisibleGroups(new Set([allGroupNames[0]]))}
            disabled={visibleGroups.size <= 1}
          >
            Clear all
          </button>
        </div>
        <ul className="filter-group-list">
          {allGroupNames.map((name, i) => {
            const color = colorForGroup(colors, i);
            return (
              <li key={name}>
                <label className="filter-group-item">
                  <input
                    type="checkbox"
                    checked={visibleGroups.has(name)}
                    onChange={() => toggleGroup(name)}
                  />
                  <span className="filter-group-swatch" style={{ background: color }} />
                  <span className="filter-group-name">{name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
