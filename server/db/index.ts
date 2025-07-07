import {drizzle, PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './users';
import 'dotenv/config';

export type Db = PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, {
    schema
});