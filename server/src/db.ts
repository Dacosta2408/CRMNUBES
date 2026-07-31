import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool configuration
export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  database: process.env.PGDATABASE || "gbk_crm",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  max: parseInt(process.env.PGMAX_CONNECTIONS || "20", 10),
  idleTimeoutMillis: parseInt(process.env.PGIDLE_TIMEOUT_MS || "30000", 10),
  connectionTimeoutMillis: 3000,
});

let isPgConnected = false;

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  isPgConnected = false;
});

/**
 * Tests database connectivity and returns current status
 */
export async function checkDbConnection(): Promise<{ connected: boolean; message: string; database?: string }> {
  try {
    const client = await pool.connect();
    const res = await client.query("SELECT NOW() as now_time, current_database() as db_name");
    client.release();
    isPgConnected = true;
    return {
      connected: true,
      message: `Successfully connected to PostgreSQL database [${res.rows[0].db_name}] at ${res.rows[0].now_time}`,
      database: res.rows[0].db_name
    };
  } catch (err: any) {
    isPgConnected = false;
    return {
      connected: false,
      message: `PostgreSQL connection check failed: ${err.message || err}`
    };
  }
}

export function getIsPgConnected(): boolean {
  return isPgConnected;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log("Executed SQL query", { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (err: any) {
    console.error("SQL query execution error:", { text: text.substring(0, 100), error: err.message });
    throw err;
  }
}
