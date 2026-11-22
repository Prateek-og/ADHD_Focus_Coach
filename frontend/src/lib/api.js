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
 */
export async function apiRequest(path, { getToken, method = "GET", body, headers: extraHeaders } = {}) {
  if (!getToken) {
    throw new Error("No getToken function provided. User must be signed in.");
  }

  const token = await getToken();
  if (!token) {
    throw new Error("No active Clerk session. Sign in again.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
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

// ─── Progress endpoints ───────────────────────────────────────
function childQuery(childId) {
  return childId ? `?child_id=${childId}` : "";
}

/** GET /progress — recalculated progress snapshot */
export async function getProgress(getToken, childId = null) {
  return apiRequest(`/progress${childQuery(childId)}`, { getToken });
}

/** GET /progress/summary — counts, streak and completion rate */
export async function getProgressSummary(getToken, childId = null) {
  return apiRequest(`/progress/summary${childQuery(childId)}`, { getToken });
}

/** GET /progress/streak — current and longest streak */
export async function getProgressStreak(getToken, childId = null) {
  return apiRequest(`/progress/streak${childQuery(childId)}`, { getToken });
}

/** GET /children/:id/feedback — caregiver views feedback for a child */
export async function getChildFeedback(getToken, childId) {
  return apiRequest(`/children/${childId}/feedback`, { getToken });
}

// ─── Task endpoints ───────────────────────────────────────────

/** POST /tasks — caregiver creates a new task */
export async function createTask(getToken, taskData) {
  return apiRequest("/tasks", {
    getToken,
    method: "POST",
    body: taskData,
  });
}

/** GET /tasks?child_id=X — list tasks (caregiver sees all, child sees own) */
export async function listTasks(getToken, childId = null) {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiRequest(`/tasks${qs}`, { getToken });
}

/** GET /tasks/:id — get single task */
export async function getTask(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}`, { getToken });
}

/** PATCH /tasks/:id — caregiver updates task */
export async function updateTask(getToken, taskId, updates) {
  return apiRequest(`/tasks/${taskId}`, {
    getToken,
    method: "PATCH",
    body: updates,
  });
}

/** DELETE /tasks/:id — caregiver deletes task */
export async function deleteTask(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}`, {
    getToken,
    method: "DELETE",
  });
}

/** GET /tasks/:id/steps — get steps for a task */
export async function getTaskSteps(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/steps`, { getToken });
}

/** POST /tasks/:id/breakdown — AI generates steps for the task */
export async function breakdownTask(getToken, taskId, idempotencyKey = null) {
  return apiRequest(`/tasks/${taskId}/breakdown`, {
    getToken,
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
  });
}

// ─── Focus Session endpoints (Child only) ────────────────────

/** POST /tasks/:id/start — child starts focus session */
export async function startFocus(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/start`, { getToken, method: "POST" });
}

/** GET /tasks/:id/focus-state — poll current focus state */
export async function getFocusState(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/focus-state`, { getToken });
}

/** POST /tasks/:id/steps/:stepId/complete — child marks step done */
export async function completeStep(getToken, taskId, stepId, expectedStepPosition) {
  return apiRequest(`/tasks/${taskId}/steps/${stepId}/complete`, {
    getToken,
    method: "POST",
    body: { expected_step_position: expectedStepPosition },
  });
}

/** POST /tasks/:id/steps/:stepId/stuck — child says they're stuck, AI helps */
export async function handleStuck(getToken, taskId, stepId, reason, expectedStepPosition, idempotencyKey = null) {
  return apiRequest(`/tasks/${taskId}/steps/${stepId}/stuck`, {
    getToken,
    method: "POST",
    body: { reason, expected_step_position: expectedStepPosition },
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
  });
}

/** POST /tasks/:id/break — child takes a break */
export async function takeBreak(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/break`, { getToken, method: "POST" });
}

/** POST /tasks/:id/resume — child resumes from break */
export async function resumeFocus(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/resume`, { getToken, method: "POST" });
}

/** POST /tasks/:id/lets-go — child responds to inactivity prompt */
export async function letsGo(getToken, taskId) {
  return apiRequest(`/tasks/${taskId}/lets-go`, { getToken, method: "POST" });
}

// ─── Feedback endpoints ───────────────────────────────────────

/** POST /tasks/:id/feedback — child submits post-task feedback */
export async function submitFeedback(getToken, taskId, feedbackData) {
  return apiRequest(`/tasks/${taskId}/feedback`, {
    getToken,
    method: "POST",
    body: feedbackData,
  });
}

// ─── Notification endpoints ───────────────────────────────────

/** GET /notifications — list notifications for current user */
export async function getNotifications(getToken) {
  return apiRequest("/notifications", { getToken });
}
