import MiniSearch from 'minisearch';
import { useMemo, useState } from 'react';

export function useSearch(events) {
  const index = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['recordText', 'groupName', 'status'],
      storeFields: ['id'],
      searchOptions: { prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(
      events.map((e) => ({
        id: e.id,
        recordText: e.recordText,
        groupName: e.groupName,
        status: e.status,
      })),
    );
    return ms;
  }, [events]);

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return index.search(query).slice(0, 50);
  }, [index, query]);

  return { query, setQuery, results };
}
