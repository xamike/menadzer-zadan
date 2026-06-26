import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, initDB } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "redis";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

await initDB();

const redisClient = createClient({
  url: "redis://project-redis:6379"
});

redisClient.on("error", (err) => console.error("Błąd klienta Redis:", err));

try {
  await redisClient.connect();
  console.log("🚀 Połączono z pamięcią podręczną Redis!");
} catch (err) {
  console.error("Nie udało się połączyć z Redisem:", err);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    console.log("⚠️ Próba dostępu zablokowana: Brak tokena autoryzacji.");
    return res.status(401).json({ error: "Brak tokena" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("⚠️ Próba dostępu zablokowana: Nieprawidłowy lub wygasły token.");
    return res.status(401).json({ error: "Zły token" });
  }
}

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Brak danych" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hash]
    );

    res.json({ message: "User created" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Brak danych" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No user found" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login error" });
  }
});

app.get("/tasks", authMiddleware, async (req, res) => {
  const cacheKey = `tasks:${req.user.id}`;

  try {
    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      console.log(`[REDIS] ⚡ Dane pobrane z cache dla użytkownika ${req.user.id}`);
      return res.json(JSON.parse(cachedTasks));
    }

    console.log(`[POSTGRES] 🗄️ Brak cache. Pobieranie z bazy danych dla użytkownika ${req.user.id}`);
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );

    await redisClient.setEx(cacheKey, 30, JSON.stringify(result.rows));

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd pobierania tasków" });
  }
});

app.post("/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Brak tytułu" });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description, req.user.id]
    );

    await redisClient.del(`tasks:${req.user.id}`);
    console.log(`[REDIS] 🧹 Usunięto stary cache dla użytkownika ${req.user.id} (dodano nowe zadanie)`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd tworzenia taska" });
  }
});

app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM tasks WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );

    await redisClient.del(`tasks:${req.user.id}`);
    console.log(`[REDIS] 🧹 Usunięto stary cache dla użytkownika ${req.user.id} (usunięto zadanie)`);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd usuwania taska" });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend działa na porcie ${PORT}`);
});