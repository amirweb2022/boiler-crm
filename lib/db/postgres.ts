import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

// A PostgreSQL date is a calendar day, not a timestamp. Preserve its ISO form.
types.setTypeParser(1082, (value: string) => value);

declare global {
  // eslint-disable-next-line no-var
  var postgresPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

function getPool(): Pool {
  if (!globalThis.postgresPool) globalThis.postgresPool = createPool();
  return globalThis.postgresPool;
}

export function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: any[] = [],
): Promise<QueryResult<Row>> {
  return getPool().query<Row>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
