import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import pool from "./db.js";
import patientsRouter from "./routes/patients.js";
import recipesRouter from "./routes/recipes.js";
import mealRequestsRouter from "./routes/mealRequests.js";
import traysRouter from "./routes/trays.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : undefined;

app.use(
  cors(
    allowedOrigins
      ? { origin: allowedOrigins, credentials: true }
      : undefined,
  ),
);
app.use(express.json());
app.use(morgan("short"));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/api/patients", patientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-requests", mealRequestsRouter);
app.use("/api/trays", traysRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

function shutdown() {
  console.log("Shutting down gracefully…");
  server.close(async () => {
    await pool.end();
    console.log("Database pool closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
