/**
 * API client for communicating with the ADHD Focus Coach backend.
 *
 * Pattern taken from clerk_test/index.html:
 *   - Get a Clerk session token
 *   - Send it as `Authorization: Bearer <token>`
 *   - Backend validates via Clerk JWKS
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

/**
 * Make an authenticated request to the backend API.
 *
 * @param {string} path - API path (e.g. "/auth/me")
 * @param {object} options - fetch options plus `getToken` from Clerk
 * @param {Function} options.getToken - Clerk's `session.getToken()` or `getToken` from `useAuth()`
 * @param {string} [options.method] - HTTP method
 * @param {object} [options.body] - JSON body (will be stringified)
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiRequest(path, { getToken, method = "GET", body } = {}) {
  if (!getToken) {
    throw new Error("No getToken function provided. User must be signed in.");
  }

  const token = await getToken();
  if (!token) {
    throw new Error("No active Clerk session. Sign in again.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      data?.detail || data?.message || (typeof data === "string" ? data : JSON.stringify(data));
    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  return data;
}

// ─── Auth endpoints ──────────────────────────────────────────

/** POST /auth/onboard — register user in the app after Clerk signup */
export async function onboardUser(getToken, role = "CAREGIVER") {
  return apiRequest("/auth/onboard", {
    getToken,
    method: "POST",
    body: { role },
  });
}

/** GET /auth/me — get the current application user */
export async function getMe(getToken) {
  return apiRequest("/auth/me", { getToken });
}

// ─── Child endpoints ─────────────────────────────────────────

/** POST /children — caregiver creates a child profile + Clerk account */
export async function createChild(getToken, childData) {
  return apiRequest("/children", {
    getToken,
    method: "POST",
    body: childData,
  });
}

/** GET /children — caregiver lists all their children */
export async function listChildren(getToken) {
  return apiRequest("/children", { getToken });
}

/** GET /children/:id — get a specific child profile */
export async function getChild(getToken, childId) {
  return apiRequest(`/children/${childId}`, { getToken });
}

/** PATCH /children/:id — update a child profile */
export async function updateChild(getToken, childId, updates) {
  return apiRequest(`/children/${childId}`, {
    getToken,
    method: "PATCH",
    body: updates,
  });
}

/** DELETE /children/:id — soft-delete a child profile */
export async function deleteChild(getToken, childId) {
  return apiRequest(`/children/${childId}`, {
    getToken,
    method: "DELETE",
  });
}

/** GET /children/:id/export — export all data for a child */
export async function exportChild(getToken, childId) {
  return apiRequest(`/children/${childId}/export`, { getToken });
}

