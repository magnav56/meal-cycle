import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        mr.*,
        json_build_object(
          'id', p.id, 'name', p.name, 'room_number', p.room_number,
          'diet_order', p.diet_order, 'allergies', p.allergies,
          'updated_at', p.updated_at
        ) AS patients
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
  try {
    const { requestId } = req.params;
    const { rows } = await pool.query(
      `SELECT
         ri.*,
         json_build_object(
           'id', r.id, 'name', r.name, 'description', r.description,
           'allergens', r.allergens, 'diet_tags', r.diet_tags, 'created_at', r.created_at
         ) AS recipes
       FROM request_items ri
       JOIN recipes r ON ri.recipe_id = r.id
       WHERE ri.request_id = $1`,
      [requestId]
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
 * If any violations are found, the request is saved as "Rejected" (422).
 * Otherwise it is "Finalized" and a tray is created for the kitchen.
 */
router.post("/", async (req, res) => {
  const { patientId, recipeIds } = req.body as {
    patientId: string;
    recipeIds: string[];
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [patient] } = await client.query(
      "SELECT * FROM patients WHERE id = $1",
      [patientId]
    );
    if (!patient) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const { rows: recipes } = await client.query(
      "SELECT * FROM recipes WHERE id = ANY($1)",
      [recipeIds]
    );

    const violations: string[] = [];

    for (const recipe of recipes) {
      for (const allergen of recipe.allergens) {
        if (patient.allergies.includes(allergen)) {
          violations.push(
            `"${recipe.name}" contains ${allergen} (patient allergy)`
          );
        }
      }
    }

    for (const recipe of recipes) {
      if (
        recipe.diet_tags.length > 0 &&
        !recipe.diet_tags.includes(patient.diet_order)
      ) {
        violations.push(
          `"${recipe.name}" is not compatible with ${patient.diet_order} diet`
        );
      }
    }

    const itemValues = recipeIds
      .map((_, i) => `($1, $${i + 2})`)
      .join(", ");

    if (violations.length > 0) {
      const { rows: [mealRequest] } = await client.query(
        `INSERT INTO meal_requests (patient_id, status, rejection_reason)
         VALUES ($1, 'Rejected', $2)
         RETURNING *`,
        [patientId, violations.join("; ")]
      );

      await client.query(
        `INSERT INTO request_items (request_id, recipe_id) VALUES ${itemValues}`,
        [mealRequest.id, ...recipeIds]
      );

      await client.query("COMMIT");
      res.status(422).json({ error: violations.join("\n"), request: mealRequest });
      return;
    }

    const { rows: [mealRequest] } = await client.query(
      `INSERT INTO meal_requests (patient_id, status, finalized_at)
       VALUES ($1, 'Finalized', now())
       RETURNING *`,
      [patientId]
    );

    await client.query(
      `INSERT INTO request_items (request_id, recipe_id) VALUES ${itemValues}`,
      [mealRequest.id, ...recipeIds]
    );

    await client.query(
      "INSERT INTO trays (request_id) VALUES ($1)",
      [mealRequest.id]
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
