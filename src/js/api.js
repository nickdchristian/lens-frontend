export async function fetchEvents() {
  const response = await fetch("/api/v1/events?t=" + Date.now());
  return await response.json();
}

export async function updateEventReq(id, payload) {
  const res = await fetch(`/api/v1/events/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) alert("Unauthorized: Please log in as Admin.");
  return res.ok;
}

export async function deleteEventReq(id) {
  const res = await fetch(`/api/v1/events/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) alert("Unauthorized: Please log in as Admin.");
  return res.ok;
}

export async function fetchApiKeys() {
  const res = await fetch("/api/v1/keys", {
    method: "GET",
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function createApiKey(name) {
  const res = await fetch("/api/v1/keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function revokeApiKey(id) {
  const res = await fetch(`/api/v1/keys/${id}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function checkAuthStatus() {
  const res = await fetch("/api/v1/auth/status");
  if (!res.ok) return { setup_required: false, logged_in: false };
  return await res.json();
}

export async function loginOrSetup(username, password, isSetup) {
  const endpoint = isSetup ? "/api/v1/auth/setup" : "/api/v1/auth/login";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Authentication failed");
  }
  return true;
}

export async function logout() {
  await fetch("/api/v1/auth/logout", { method: "POST" });
}

export async function getSettings() {
  const res = await fetch("/api/v1/settings");
  if (!res.ok) return null;
  return await res.json();
}

export async function updateSettings(payload) {
  const res = await fetch("/api/v1/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function getPublicSettings() {
  const res = await fetch("/api/v1/settings/public");
  if (!res.ok) return null;
  return await res.json();
}
