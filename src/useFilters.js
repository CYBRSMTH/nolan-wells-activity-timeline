import { useState } from 'react';

function readParam(paramName) {
  const raw = new URLSearchParams(window.location.search).get(paramName);
  return raw ? new Set(raw.split(',')) : null;
}

function writeParams(updates) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value.length === 0) params.delete(key);
    else params.set(key, value.join(','));
  }
  const newSearch = params.toString();
  history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
}

function writeShowRecordParam(value) {
  const params = new URLSearchParams(window.location.search);
  // Default is true — only write the param when records are hidden.
  if (value) params.delete('show_record');
  else params.set('show_record', 'false');
  const newSearch = params.toString();
  history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
}

export function useFilters(allGroupNames, allStatuses) {
  const [visibleGroups, setVisibleGroupsState] = useState(() => {
    const excluded = readParam('excluded');
    if (!excluded) return new Set(allGroupNames);
    return new Set(allGroupNames.filter((name) => !excluded.has(name)));
  });

  const [visibleStatuses, setVisibleStatusesState] = useState(() => {
    const excluded = readParam('excludedStatuses');
    if (!excluded) return new Set(allStatuses);
    return new Set(allStatuses.filter((s) => !excluded.has(s)));
  });

  const [showRecord, setShowRecordState] = useState(() => {
    const raw = new URLSearchParams(window.location.search).get('show_record');
    return raw === null ? true : raw !== 'false';
  });

  const setVisibleGroups = (groups) => {
    setVisibleGroupsState(groups);
    const excluded = allGroupNames.filter((name) => !groups.has(name));
    writeParams({ excluded });
  };

  const setVisibleStatuses = (statuses) => {
    setVisibleStatusesState(statuses);
    const excluded = allStatuses.filter((s) => !statuses.has(s));
    writeParams({ excludedStatuses: excluded });
  };

  const setShowRecord = (value) => {
    setShowRecordState(value);
    writeShowRecordParam(value);
  };

  return { visibleGroups, setVisibleGroups, visibleStatuses, setVisibleStatuses, showRecord, setShowRecord };
}
