import { db } from 'ponder:api';
import schema from 'ponder:schema';
import { Hono } from 'hono';
import { graphql } from 'ponder';

const app = new Hono();

if (process.env.NODE_ENV === 'development') {
  app.use('/', graphql({ db, schema }));
}

export default app;
