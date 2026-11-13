"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { listChildren, exportChild } from "@/lib/api";

export default function ProgressPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Insights — static for now until the backend provides analytics
  const insights = [
    {
      id: 1,
      icon: "☀️",
      title: "Golden Hour",
      primary: "Tasks before 6 PM have a 78% completion rate.",
      secondary: "",
    },
    {
      id: 2,
      icon: "⏱️",
      title: "Time Estimate Accuracy",
      primary: "Parent estimate: 20m\nActual average: 35m",
      secondary: "",
      warn: true,
    },
    {
      id: 3,
      icon: "▶️",
      title: "Starting vs Finishing",
      primary: "Time to start first step: 12 mins.",
      secondary: "High difficulty starting, but normal completion once started.",
    },
    {
      id: 4,
      icon: "⚠️",
      title: "Where they get stuck",
      primary: "Most sessions stop at Step 3.",
      secondary: "Typically deferred or abandoned.",
    },
    {
      id: 5,
      icon: "🧩",
      title: "Task Size Analysis",
      primary: "4+ step tasks are deferred 40% more often.",
      secondary: "Parent will be warned during creation.",
    },
  ];

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError("");

    try {
      const childrenData = await listChildren(getToken);
      const childList = Array.isArray(childrenData)
        ? childrenData
        : childrenData?.items || childrenData?.children || [];
      setChildren(childList);

      const childId = selectedChildId || (childList.length > 0 ? childList[0].id : null);
      if (childId) {
        setSelectedChildId(childId);
        // Try to get export data for the child
        try {
          const data = await exportChild(getToken, childId);
          setExportData(data);
        } catch (e) {
          // Export might not be available if there's no data yet
          setExportData(null);
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
    return <div className="p-8 text-center">Loading progress…</div>;
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Progress</h1>
      </header>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
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

      {/* Backend stats (if available) */}
      {exportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-extrabold text-primary">{exportData.total_tasks}</div>
            <div className="text-sm font-bold text-text-muted">Total Tasks</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">
              {exportData.completed_tasks}
            </div>
            <div className="text-sm font-bold text-text-muted">Completed</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-extrabold text-amber-600">
              {exportData.total_feedback}
            </div>
            <div className="text-sm font-bold text-text-muted">Feedback</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-extrabold text-purple-600">
              {exportData.child?.name || "—"}
            </div>
            <div className="text-sm font-bold text-text-muted">Child</div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mt-8 mb-4">AI Insights &amp; Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {insights.map((item) => (
          <div
            key={item.id}
            className="glass-card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-heading text-xl font-bold text-text-main">{item.title}</h3>
            </div>

            <p
              className={`font-body text-lg leading-relaxed ${
                item.warn ? "text-warn-ink font-bold" : "text-text-main"
              }`}
            >
              {item.primary.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </p>

            {item.secondary && (
              <p className="font-body text-sm text-text-muted mt-auto pt-2">{item.secondary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
