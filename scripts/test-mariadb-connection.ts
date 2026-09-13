import "dotenv/config";
const mariadb = require("mariadb");

async function main() {
  const url = process.env.DATABASE_URL || "";
  const u = new URL(url);
  console.log("Testing mariadb pool connection to:", u.hostname, "port:", u.port, "user:", u.username);

  const pool = mariadb.createPool({
    host: u.hostname,
    port: Number(u.port),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 1,
    connectTimeout: 5000,
    acquireTimeout: 5000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const conn = await pool.getConnection();
    console.log("✓ Successfully connected to TiDB Cloud with mariadb driver!");
    const res = await conn.query("SELECT 1 as val, VERSION() as ver");
    console.log("Query result:", res);
    conn.release();
    await pool.end();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

main();
