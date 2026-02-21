import express from "express";
import cors from "cors";
import patientsRouter from "./routes/patients.js";
import recipesRouter from "./routes/recipes.js";
import mealRequestsRouter from "./routes/mealRequests.js";
import traysRouter from "./routes/trays.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json());

app.use("/api/patients", patientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-requests", mealRequestsRouter);
app.use("/api/trays", traysRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
