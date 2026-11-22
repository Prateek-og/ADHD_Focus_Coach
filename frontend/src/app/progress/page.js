"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  listChildren,
  exportChild,
  getProgress,
  getProgressSummary,
  getChildFeedback,
  listTasks,
} from "@/lib/api";

const HELPED_BY_LABELS = {
  SMALL_STEPS: "Chhote steps",
  TIMER: "Timer",
  ENCOURAGEMENT: "Encouragement",
  SHORT_BREAKS: "Chhote breaks",
  QUIET_SPACE: "Quiet space",
};

const HARDEST_PART_LABELS = {
  GETTING_STARTED: "Shuru karna",
  UNDERSTANDING: "Samajhna",
  STAYING_FOCUSED: "Dhyan rakhna",
  REMEMBERING_NEXT_STEP: "Agla step yaad rakhna",
  NOTHING_DIFFICULT: "Kuch mushkil nahi tha",
};

const FOCUS_LEVEL_LABELS = {
  ALMOST_WHOLE_TIME: "Lagbhag poora time",
  MOST_OF_THE_TIME: "Zyada tar time",
  SOMETIMES: "Kabhi kabhi",
  LITTLE_OF_THE_TIME: "Thoda sa time",
  HARD_TO_FOCUS: "Focus mushkil raha",
};

function asList(data) {
  return Array.isArray(data) ? data : data?.items || data?.children || [];
}

function topAnswer(rows, key, labels) {
  const counts = {};
  rows.forEach((row) => {
    const value = row?.[key];
    if (value) counts[value] = (counts[value] || 0) + 1;
  });
  const [entry] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entry) return null;
  return {
    label: labels[entry[0]] || entry[0].replace(/_/g, " ").toLowerCase(),
    count: entry[1],
  };
}

function InsightCard({ icon, title, primary, secondary, warn = false }) {
  return (
    <div className="glass-card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-heading text-xl font-bold text-text-main">{title}</h3>
      </div>
      <p className={`font-body text-lg leading-relaxed ${warn ? "text-warn-ink font-bold" : "text-text-main"}`}>
        {primary}
      </p>
      {secondary && <p className="font-body text-sm text-text-muted mt-auto pt-2">{secondary}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError("");

    try {
      const childList = asList(await listChildren(getToken));
      setChildren(childList);

      const childId = selectedChildId || childList[0]?.id || null;
      if (!childId) {
        setExportData(null);
        setProgress(null);
        setSummary(null);
        setFeedback([]);
        setTasks([]);
        return;
      }
      setSelectedChildId(childId);

      const [exportRes, progressRes, summaryRes, feedbackRes, tasksRes] =
        await Promise.allSettled([
          exportChild(getToken, childId),
          getProgress(getToken, childId),
          getProgressSummary(getToken, childId),
          getChildFeedback(getToken, childId),
          listTasks(getToken, childId),
        ]);

      setExportData(exportRes.status === "fulfilled" ? exportRes.value : null);
      setProgress(progressRes.status === "fulfilled" ? progressRes.value : null);
      setSummary(summaryRes.status === "fulfilled" ? summaryRes.value : null);
      setFeedback(feedbackRes.status === "fulfilled" ? asList(feedbackRes.value) : []);
      setTasks(tasksRes.status === "fulfilled" ? asList(tasksRes.value) : []);
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

  const total = exportData?.total_tasks ?? summary?.tasks_total ?? 0;
  const completed = exportData?.completed_tasks ?? summary?.tasks_completed ?? 0;
  const pending = Math.max(0, total - completed);
  const completionPct = summary ? Math.round((summary.completion_rate || 0) * 100) : null;
  const avgMinutes = progress?.average_completion_minutes
    ? Math.round(progress.average_completion_minutes)
    : null;
  const topHelped = topAnswer(feedback, "helped_by", HELPED_BY_LABELS);
  const topHardest = topAnswer(feedback, "hardest_part", HARDEST_PART_LABELS);
  const topFocus = topAnswer(feedback, "focus_level", FOCUS_LEVEL_LABELS);
  const preferences = exportData?.preferences
    ? exportData.preferences.split(";").map((s) => s.trim()).filter(Boolean)
    : [];
  const recentSummary = summary?.recent_summary || progress?.recent_summary || null;

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Progress</h1>
        <p className="text-text-muted font-bold mt-2">
          Real data from your child&apos;s focus sessions and feedback.
        </p>
      </header>

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-extrabold text-primary">{total}</div>
          <div className="text-sm font-bold text-text-muted">Total Tasks</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-extrabold text-emerald-600">{completed}</div>
          <div className="text-sm font-bold text-text-muted">Completed</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-extrabold text-amber-600">
            {summary?.current_streak ?? 0}
          </div>
          <div className="text-sm font-bold text-text-muted">Current Streak</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-extrabold text-purple-600">
            {summary?.steps_completed ?? 0}
          </div>
          <div className="text-sm font-bold text-text-muted">Steps Done</div>
        </div>
      </div>

      {recentSummary && (
        <div className="glass-card p-5 font-bold text-text-main">{recentSummary}</div>
      )}

      <h2 className="text-2xl font-bold mt-8 mb-4">AI Insights &amp; Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <InsightCard
          icon="🎯"
          title="Completion Rate"
          primary={completionPct === null ? "Abhi data nahi" : `${completionPct}%`}
          secondary={completionPct === null ? undefined : `${completed} of ${total} tasks complete`}
        />
        <InsightCard
          icon="🧩"
          title="Steps Completed"
          primary={`${summary?.steps_completed ?? 0} steps`}
          secondary={avgMinutes ? `Avg ${avgMinutes} min from creation to finish` : undefined}
        />
        <InsightCard
          icon="⏳"
          title="Still To Do"
          primary={`${pending} tasks`}
          secondary={`${tasks.length} tasks loaded from backend`}
          warn={pending > 0}
        />
        <InsightCard
          icon="🤝"
          title="What Helped Most"
          primary={topHelped ? `${topHelped.label} (${topHelped.count}×)` : "Feedback abhi nahi mila"}
          secondary={topHelped ? `From ${feedback.length} feedback answers` : "Feedback form complete karne par yahan dikhega."}
        />
        <InsightCard
          icon="🧗"
          title="Hardest Part"
          primary={topHardest ? `${topHardest.label} (${topHardest.count}×)` : "Abhi data nahi"}
          secondary={topHardest ? "Most common answer in post-task feedback" : undefined}
        />
        <InsightCard
          icon="🔍"
          title="Focus Level"
          primary={topFocus ? `${topFocus.label} (${topFocus.count}×)` : "Abhi data nahi"}
          secondary={preferences.length ? `Learned: ${preferences.join(", ")}` : undefined}
        />
      </div>
    </div>
  );
}
