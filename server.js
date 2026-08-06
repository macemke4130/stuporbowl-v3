import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { query, apiRoute, prepData } from "./dbConnect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// 1. All Express API Routes (/api/*)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

app.get("/api/db", async (req, res) => {
  const sql = await query(`SELECT * FROM year2026;`);

  res.json(sql);
});

// 2. Production Only: Serve Astro's built static files
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));

  // Catch-all route to serve Astro index page for non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
