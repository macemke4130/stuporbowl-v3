import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { query, apiRoute, prepData } from "./dbConnect.js";
import auth from "./auth.js";

const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = ["http://localhost:4321"];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS. Contact www.stuporbowl.org to request access."));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Allow cookies/auth headers if needed
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(auth);

const humanReadableDate = (isoString) => {
  const date = new Date(isoString);

  const getOrdinal = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getUTCDate(); // Use getUTCDate for exact ISO UTC match
  const year = date.getUTCFullYear();

  const time = date
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Chicago",
    })
    .toLowerCase()
    .replace(" ", "");

  return `${month} ${day}${getOrdinal(day)}, ${year} ${time}`;
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

app.get("/api/racers/2026", async (req, res) => {
  const sql = await query(`SELECT * FROM year2026;`);
  res.json(sql);
});

app.get("/api/posts", async (req, res) => {
  const sql = await query(
    `select posts.id, posts.date_created, posts.title, posts.content, users.full_name as display_name from posts join users on posts.posted_by = users.id ORDER BY posts.date_created DESC;`,
  );

  const postsWithFormattedDates = sql.map((post) => {
    return {
      ...post,
      datePosted: humanReadableDate(post.date_created),
    };
  });

  res.json(postsWithFormattedDates);
});

// 2. Production Only: Serve Astro's built static files
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));

  // Catch-all route to serve Astro index page for non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.get("/api/post/:id", async (req, res) => {
  const postId = req.params.id;

  const sql = await query(
    `select posts.date_created, posts.title, posts.content, posts.posted_by from posts join users on posts.posted_by = users.id where posts.id = ?`,
    postId,
  );

  res.json(sql[0]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
