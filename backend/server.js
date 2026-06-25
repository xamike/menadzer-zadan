import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, initDB } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

await initDB();


// ===============================
// 🔐 AUTH MIDDLEWARE
// ===============================
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "Brak tokena" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Zły token" });
  }
}


// ===============================
// 🔐 AUTH
// ===============================

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


// ===============================
// 📝 TASKS (PROTECTED)
// ===============================

app.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC",
      [req.user.id]
    );

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

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd usuwania taska" });
  }
});


// ===============================
// 🚀 START
// ===============================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend działa na porcie ${PORT}`);
});