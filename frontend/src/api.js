const API = "http://localhost:4000";

export async function register(email, password) {
  return fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }).then(r => r.json());
}

export async function login(email, password) {
  return fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }).then(r => r.json());
}

export async function getTasks(token) {
  return fetch(`${API}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(r => r.json());
}

export async function createTask(token, data) {
  return fetch(`${API}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  }).then(r => r.json());
}

export async function deleteTask(token, id) {
  return fetch(`${API}/tasks/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(r => r.json());
}