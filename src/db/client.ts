import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const sqlite = openDatabaseSync('repforge.db', {
  enableChangeListener: true,
  useNewConnection: true,
});
sqlite.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

export const db = drizzle(sqlite, { schema });
