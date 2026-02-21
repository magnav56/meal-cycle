import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "mealflow",
  user: process.env.DB_USER || "mealflow",
  password: process.env.DB_PASSWORD || "mealflow",
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export default pool;
