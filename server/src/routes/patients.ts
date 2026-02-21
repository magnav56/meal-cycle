import { Router } from "express";
import pool from "../db.js";

const router = Router();

const ALLOWED_UPDATE_FIELDS = new Set([
  "name",
  "room_number",
  "diet_order",
  "allergies",
  "clinical_state",
]);

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM patients ORDER BY updated_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, room_number, diet_order, allergies, clinical_state } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO patients (name, room_number, diet_order, allergies, clinical_state)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, room_number || null, diet_order || "Regular", allergies || [], clinical_state || "Stable"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter((k) => ALLOWED_UPDATE_FIELDS.has(k));
    if (keys.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);

    const { rows } = await pool.query(
      `UPDATE patients SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
