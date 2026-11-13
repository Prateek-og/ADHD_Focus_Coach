"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiRequest, listChildren } from "@/lib/api";

export default function TasksPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch children first, then tasks for the selected child
  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError("");

    try {
      // Get children
      const childrenData = await listChildren(getToken);
      const childList = Array.isArray(childrenData)
        ? childrenData
        : childrenData?.items || childrenData?.children || [];
      setChildren(childList);

      // Select first child if none selected
      const childId = selectedChildId || (childList.length > 0 ? childList[0].id : null);
      if (childId) {
        setSelectedChildId(childId);

        // Try fetching tasks — backend may not have task routes enabled yet
        try {
          const taskData = await apiRequest(`/tasks?child_id=${childId}`, { getToken });
          const taskList = Array.isArray(taskData)
            ? taskData
            : taskData?.items || taskData?.tasks || [];
          setTasks(taskList);
        } catch (e) {
          // If task routes aren't enabled yet, show placeholder data
          if (/404|405/.test(e.message)) {
            setTasks([]);
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken, selectedChildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded || loading) {
    return <div className="p-8 text-center">Loading tasks…</div>;
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Tasks</h1>
        <button className="px-6 py-3 bg-primary text-white font-heading font-extrabold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 w-fit">
          + New Task
        </button>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedChildId(c.id);
              }}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                c.id === selectedChildId
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {c.name || `Child #${c.id}`}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl font-bold text-sm">{error}</div>
      )}

      {tasks.length === 0 && !error && (
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-text-muted">
            {children.length === 0
              ? "Create a child profile first to manage tasks."
              : "No tasks yet. Create a task to get started!"}
          </p>
          <p className="text-sm text-text-muted mt-2">
            Note: Task routes may not be enabled on the backend yet. Check that the task_router is
            included in backend/app/main.py.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="glass-card p-6 flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-text-main mb-2">{t.title}</h2>
              <div className="text-sm font-bold text-text-muted mb-4">
                {t.scheduled_time || t.at || ""} • {t.estimated_minutes || t.minutes || "?"} min •{" "}
                {t.recurrence || t.recur || ""} • {t.priority || "Normal"}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-extrabold uppercase">
                  {t.steps?.length || t.step_count || 0} steps
                </span>
                {(t.reward || t.reward_text) && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold uppercase flex items-center gap-1">
                    <span>🏆</span> {t.reward || t.reward_text}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-100 text-text-main font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Edit
              </button>
              <button className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
