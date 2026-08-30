import pg from "pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

function connectionString() {
  const direct = new URL(process.env.DATABASE_URL);
  const match = direct.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (!match || !process.env.SUPABASE_DB_REGION) return process.env.DATABASE_URL;
  direct.hostname = `aws-0-${process.env.SUPABASE_DB_REGION}.pooler.supabase.com`;
  direct.port = "6543";
  direct.username = `postgres.${match[1]}`;
  return direct.toString();
}

const resolvedDatabaseUrl = connectionString();

const needsSsl = !/localhost|127\.0\.0\.1/.test(resolvedDatabaseUrl);

export const pool = new pg.Pool({
  connectionString: resolvedDatabaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  min: 1,
  idleTimeoutMillis: 5 * 60 * 1000,
  connectionTimeoutMillis: 10 * 1000,
  keepAlive: true,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
