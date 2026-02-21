import { Router } from "express";
import pool from "../db.js";

const router = Router();

const TRAY_STATUSES = [
  "Preparation Started",
  "Accuracy Validated",
  "En Route",
  "Delivered",
  "Retrieved",
];

const TIMESTAMP_FIELDS: Record<string, string> = {
  "Accuracy Validated": "accuracy_validated_at",
  "En Route": "en_route_at",
  Delivered: "delivered_at",
  Retrieved: "retrieved_at",
};

const TRAY_WITH_RELATIONS = `
  SELECT
    t.*,
    json_build_object(
      'id', mr.id, 'patient_id', mr.patient_id, 'status', mr.status,
      'rejection_reason', mr.rejection_reason, 'finalized_at', mr.finalized_at,
      'created_at', mr.created_at,
      'patients', json_build_object(
        'id', p.id, 'name', p.name, 'room_number', p.room_number,
        'diet_order', p.diet_order, 'allergies', p.allergies,
        'updated_at', p.updated_at
      )
    ) AS meal_requests
  FROM trays t
  JOIN meal_requests mr ON t.request_id = mr.id
  JOIN patients p ON mr.patient_id = p.id
`;

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `${TRAY_WITH_RELATIONS} ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/trays error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Advances a tray to the next status in the lifecycle:
 * Preparation Started → Accuracy Validated → En Route → Delivered → Retrieved
 */
router.patch("/:id/advance", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      rows: [tray],
    } = await pool.query("SELECT * FROM trays WHERE id = $1", [id]);
    if (!tray) {
      res.status(404).json({ error: "Tray not found" });
      return;
    }

    const currentIdx = TRAY_STATUSES.indexOf(tray.status);
    if (currentIdx >= TRAY_STATUSES.length - 1) {
      res.status(400).json({ error: "Tray already at final status" });
      return;
    }

    const nextStatus = TRAY_STATUSES[currentIdx + 1];
    const tsField = TIMESTAMP_FIELDS[nextStatus];

    const updateQuery = tsField
      ? `UPDATE trays SET status = $2, ${tsField} = now() WHERE id = $1 RETURNING *`
      : "UPDATE trays SET status = $2 WHERE id = $1 RETURNING *";

    await pool.query(updateQuery, [id, nextStatus]);

    const { rows: [full] } = await pool.query(
      `${TRAY_WITH_RELATIONS} WHERE t.id = $1`,
      [id]
    );

    res.json(full);
  } catch (err) {
    console.error("PATCH /api/trays/:id/advance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
