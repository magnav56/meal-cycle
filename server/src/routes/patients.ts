import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";

const router = Router();

const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  room_number: z.string().max(50).optional(),
  diet_order: z.string().default("Regular"),
  allergies: z.array(z.string()).default([]),
  clinical_state: z.string().default("Stable"),
});

const updatePatientSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    room_number: z.string().max(50).nullable().optional(),
    diet_order: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    clinical_state: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "No fields to update");

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
      "SELECT * FROM patients ORDER BY updated_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    });
    return;
  }
  try {
    const { name, room_number, diet_order, allergies, clinical_state } =
      parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO patients (name, room_number, diet_order, allergies, clinical_state)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, room_number ?? null, diet_order, allergies, clinical_state],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/patients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    });
    return;
  }

  try {
    const id = idResult.data;
    const fields = parsed.data;
    const keys = Object.keys(fields).filter((k) =>
      ALLOWED_UPDATE_FIELDS.has(k),
    );
    if (keys.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => (fields as Record<string, unknown>)[k]);

    const { rows } = await pool.query(
      `UPDATE patients SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
      [id, ...values],
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
