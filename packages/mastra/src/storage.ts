import { LibSQLStore } from '@mastra/libsql';
import { env } from './env';

export function createStorage(id: string) {
  return new LibSQLStore({
    id,
    url: env.TURSO_DATABASE_URL ?? 'file:./mastra.db',
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
