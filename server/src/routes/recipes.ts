import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM recipes ORDER BY name");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/recipes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
