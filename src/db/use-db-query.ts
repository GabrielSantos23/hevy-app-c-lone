import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';

export function useDbQuery<T>(run: (version: number) => T, tables: string[]): T {
  const [version, setVersion] = useState(0);
  const key = tables.join();
  useEffect(() => {
    const watched = key.split(',');
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (watched.includes(tableName)) setVersion((v) => v + 1);
    });
    return () => sub.remove();
  }, [key]);
  return useMemo(() => run(version), [run, version]);
}
