import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";

const router = Router();

const createMealRequestSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  recipeIds: z.array(z.string().uuid("Invalid recipe ID")).min(1, "At least one recipe is required"),
});

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        mr.*,
        json_build_object(
          'id', p.id, 'name', p.name, 'room_number', p.room_number,
          'diet_order', p.diet_order, 'allergies', p.allergies,
          'updated_at', p.updated_at
        ) AS patient
      FROM meal_requests mr
      JOIN patients p ON mr.patient_id = p.id
      ORDER BY mr.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/meal-requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:requestId/items", async (req, res) => {
  const idResult = z.string().uuid().safeParse(req.params.requestId);
  if (!idResult.success) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         ri.*,
         json_build_object(
           'id', r.id, 'name', r.name, 'description', r.description,
           'allergens', r.allergens, 'diet_tags', r.diet_tags, 'created_at', r.created_at
         ) AS recipe
       FROM request_items ri
       JOIN recipes r ON ri.recipe_id = r.id
       WHERE ri.request_id = $1`,
      [idResult.data],
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/meal-requests/:id/items error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Creates a meal request with safety validation.
 * Checks selected recipes against the patient's allergies and diet order.
 * If any violations are found, returns a 422 with the error details — no record is persisted.
 * Otherwise the request is saved as "Finalized" and a tray is created for the kitchen.
 */
router.post("/", async (req, res) => {
  const parsed = createMealRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    });
    return;
  }

  const { patientId, recipeIds } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [patient],
    } = await client.query("SELECT * FROM patients WHERE id = $1", [patientId]);
    if (!patient) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const { rows: recipes } = await client.query(
      "SELECT * FROM recipes WHERE id = ANY($1)",
      [recipeIds],
    );

    const violations: string[] = [];

    for (const recipe of recipes) {
      for (const allergen of recipe.allergens as string[]) {
        if ((patient.allergies as string[]).includes(allergen)) {
          violations.push(
            `"${recipe.name}" contains ${allergen} (patient allergy)`,
          );
        }
      }
    }

    for (const recipe of recipes) {
      if (
        (recipe.diet_tags as string[]).length > 0 &&
        !(recipe.diet_tags as string[]).includes(patient.diet_order as string)
      ) {
        violations.push(
          `"${recipe.name}" is not compatible with ${patient.diet_order} diet`,
        );
      }
    }

    if (violations.length > 0) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: violations.join("\n") });
      return;
    }

    const {
      rows: [mealRequest],
    } = await client.query(
      `INSERT INTO meal_requests (patient_id, status, finalized_at)
       VALUES ($1, 'Finalized', now())
       RETURNING *`,
      [patientId],
    );

    const itemValues = recipeIds
      .map((_, i) => `($1, $${i + 2})`)
      .join(", ");

    await client.query(
      `INSERT INTO request_items (request_id, recipe_id) VALUES ${itemValues}`,
      [mealRequest.id, ...recipeIds],
    );

    await client.query(
      "INSERT INTO trays (request_id) VALUES ($1)",
      [mealRequest.id],
    );

    await client.query("COMMIT");
    res.status(201).json(mealRequest);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/meal-requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
