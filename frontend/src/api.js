const API = (import.meta.env.PROD ? "/api" : (import.meta.env.VITE_API_URL || "/api")).replace(/\/+$/, "");
const TOKEN_KEY = "edupass_token";

function getToken() {
  const stored = localStorage.getItem(TOKEN_KEY)?.trim();
  return stored?.replace(/^Bearer\s+/i, "") || null;
}

function handleUnauthorized(path, status) {
  if (status !== 401 || path.startsWith("/auth/login")) return;
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("edupass:auth-expired"));
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data =
    response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    handleUnauthorized(path, response.status);
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export async function uploadApi(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    body,
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    handleUnauthorized(path, response.status);
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
export async function downloadDocument(id) {
  const response = await fetch(`${API}/permissions/documents/${id}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    handleUnauthorized(`/permissions/documents/${id}`, response.status);
    throw new Error(data.message || "Unable to open document");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
