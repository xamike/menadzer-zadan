import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function register() {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    alert(data.message || data.error);
  }

  async function login() {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setTasks([]);
  }

  async function loadTasks() {
    const res = await fetch(`${API}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    setTasks(data);
  }

  async function addTask() {
    if (!title) return;

    await fetch(`${API}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
      }),
    });

    setTitle("");
    setDescription("");

    loadTasks();
  }

  async function deleteTask(id) {
    await fetch(`${API}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    loadTasks();
  }

  useEffect(() => {
    if (token) {
      loadTasks();
    }
  }, [token]);

  return (
    <div className="container">

      <div className="header">
        <h1>📋 Menedżer Zadań</h1>
      </div>

      {!token && (
        <div className="card">

          <h2>Logowanie</h2>

          <br />

          <div className="form-grid">

            <input
              placeholder="Adres e-mail"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <div className="auth-buttons">
              <button
                className="btn-primary"
                onClick={login}
              >
                Zaloguj się
              </button>

              <button
                className="btn-primary"
                onClick={register}
              >
                Zarejestruj się
              </button>
            </div>

          </div>

        </div>
      )}

      {token && (
        <>
          <div className="logged">
            Zalogowano pomyślnie
          </div>

          <div className="card">

            <h2>Dodaj nowe zadanie</h2>

            <br />

            <div className="form-grid">

              <input
                placeholder="Tytuł zadania"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />

              <textarea
                rows="4"
                placeholder="Opis zadania"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

              <button
                className="btn-primary"
                onClick={addTask}
              >
                Dodaj zadanie
              </button>

              <button
                className="btn-danger"
                onClick={logout}
              >
                Wyloguj
              </button>

            </div>

          </div>

          <div className="card">

            <h2>Twoje zadania</h2>

            <br />

            <div className="tasks">

              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="task-card"
                >
                  <div className="task-top">

                    <div className="task-title">
                      {task.title}
                    </div>

                  </div>

                  <div className="task-description">
                    {task.description}
                  </div>

                  <div
                    className="status todo"
                  >
                    Do wykonania
                  </div>

                  <div className="task-actions">

                    <button
                      className="btn-danger"
                      onClick={() =>
                        deleteTask(task.id)
                      }
                    >
                      Usuń zadanie
                    </button>

                  </div>

                </div>
              ))}

            </div>

          </div>
        </>
      )}

    </div>
  );
}