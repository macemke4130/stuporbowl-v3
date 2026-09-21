import express from "express";
import cors from "cors";
import RSS from "rss";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { query, prepData, transaction } from "./dbConnect.js";
import auth from "./auth.js";

const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = ["http://localhost:4321", "http://192.168.86.28:4321", "https://stupor-v3-95c7b9efa6fc.herokuapp.com", "https://www.stuporbowl.org"];

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

app.get("/api/posts", async (req, res) => {
  try {
    const sql = await query(
      `select posts.id, posts.date_created, posts.title, posts.content, users.full_name as display_name from posts join users on posts.posted_by = users.id ORDER BY posts.date_created DESC;`,
    );

    const postsWithFormattedDates = sql.map((post) => {
      return {
        ...post,
        datePosted: humanReadableDate(post.date_created),
      };
    });

    res.json({
      status: 200,
      message: `All posts.`,
      data: postsWithFormattedDates,
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Server error",
      data: error,
    });
  }
});

// I don't think this is used yet.
app.get("/api/post/:id", async (req, res) => {
  const postId = req.params.id;

  const sql = await query(
    `select posts.date_created, posts.title, posts.content, posts.posted_by from posts join users on posts.posted_by = users.id where posts.id = ?`,
    postId,
  );

  res.json({
    status: 200,
    message: `Post with id ${postId}.`,
    data: sql[0],
  });
});

app.post("/api/registrations/2027", async (req, res) => {
  const raceYear = 2027;

  try {
    const data = prepData(req.body);

    // Pass your queries inside the transaction callback
    const result = await transaction(async (txQuery) => {
      // 1. Increment counter on dedicated transaction connection
      await txQuery(
        `INSERT INTO racer_counters (race_year, last_racer_number) 
         VALUES (?, 1) 
         ON DUPLICATE KEY UPDATE last_racer_number = LAST_INSERT_ID(last_racer_number + 1)`,
        [raceYear],
      );

      // 2. Fetch assigned racer number
      const [counterResult] = await txQuery("SELECT LAST_INSERT_ID() AS racer_number");
      const assignedRacerNumber = counterResult.racer_number;

      // 3. Prepare payload with race_year and racer_number
      const columns = `${data.columns}, race_year, racer_number`;
      const marks = `${data.marks}, ?, ?`;
      const values = [...data.values, raceYear, assignedRacerNumber];

      // 4. Insert registration on same connection
      const sql = await txQuery(`INSERT INTO registrations (${columns}) VALUES (${marks})`, values);

      return { sql, assignedRacerNumber };
    });

    const dataForClient = {
      ...result.sql,
      racer_number: result.assignedRacerNumber,
    };

    data.racer_number = result.assignedRacerNumber;

    res.json({
      status: 200,
      message: "Successfully registered racer",
      data: dataForClient,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.sqlMessage || "Registration failed",
      status: error.errno || 500,
      data: null,
    });
  }
});

function getDbPath() {
  const paths = [path.resolve(process.cwd(), "dist/images.db"), path.resolve(process.cwd(), "images.db")];

  for (const dbPath of paths) {
    try {
      // Test opening the DB; if it exists and is readable, return the path
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      db.close();
      return dbPath;
    } catch (e) {
      // Path doesn't exist, continue checking next candidate path
    }
  }

  throw new Error("images.db file not found.");
}

// Get exif and gps photo data.
app.post("/api/images/photo-data", (req, res) => {
  try {
    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: "Please provide a non-empty array of filenames." });
    }

    const dbPath = getDbPath();
    const db = new Database(dbPath, { readonly: true });

    const placeholders = filenames.map(() => "?").join(",");

    const stmt = db.prepare(`
      SELECT 
        id,
        filename, 
        date_taken, 
        width, 
        height, 
        make, 
        model, 
        latitude, 
        longitude
      FROM images
      WHERE filename IN (${placeholders})
      ORDER BY date_taken DESC
    `);

    const images = stmt.all(...filenames);
    db.close();

    res.json({ count: images.length, images });
  } catch (error) {
    console.error("Error fetching images by filenames:", error);
    res.status(500).json({ error: "Failed to retrieve image metadata." });
  }
});

app.get("/rss.xml", async (req, res) => {
  try {
    // 1. Fetch dynamic posts from MySQL
    const mysqlPostsRaw = await query(
      `select posts.id, posts.date_created, posts.title, posts.content, users.full_name as display_name from posts join users on posts.posted_by = users.id ORDER BY posts.date_created DESC;`,
    );

    const mysqlPosts = mysqlPostsRaw.map((post) => ({
      title: post.title,
      url: `https://www.stuporbowl.org/news/${post.id}`,
      date: new Date(post.date_created),
      guid: `db-${post.id}`,
    }));

    // 2. Read the static manifest generated by the Astro build
    const jsonPath = path.join(process.cwd(), "dist/static-posts.json");
    const staticPostsRaw = JSON.parse(await fs.readFile(jsonPath, "utf-8"));

    const staticPosts = staticPostsRaw.map((post) => ({
      title: post.title,
      url: `https://www.stuporbowl.org${post.url}`,
      date: new Date(post.date),
      guid: `static-${post.url}`,
    }));

    // 3. Merge both sources & sort descending by date
    const allPosts = [...mysqlPosts, ...staticPosts].sort((a, b) => b.date - a.date);

    // 4. Build RSS XML
    const feed = new RSS({
      title: "stuporbowl.org updates.",
      description: "Combined updates from database and static Astro pages",
      feed_url: "https://www.stuporbowl.org/rss.xml",
      site_url: "https://www.stuporbowl.org",
      language: "en",
    });

    allPosts.forEach((post) => {
      feed.item({
        title: post.title,
        url: post.url,
        date: post.date,
        guid: post.guid,
      });
    });

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(feed.xml({ indent: true }));
  } catch (err) {
    console.error("Error serving RSS:", err);
    res.status(500).send("Error generating RSS");
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
