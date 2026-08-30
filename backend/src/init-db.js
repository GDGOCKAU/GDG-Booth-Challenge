import { pool } from "./db.js";
import { schemaSql } from "./schema.js";
import { seedDatabase } from "./seed.js";

try {
  const client = await pool.connect();
  try {
    await client.query(schemaSql);
    await seedDatabase(client);
    console.log("Database schema and demo data are ready.");
  } finally {
    client.release();
  }
} catch (error) {
  if (error.code === "ENOENT" && /\.supabase\.co/i.test(error.hostname || "")) {
    console.error("Could not resolve the direct Supabase database host. Use the IPv4-compatible Transaction pooler DATABASE_URL from Supabase → Connect.");
  }
  throw error;
} finally {
  await pool.end();
}
