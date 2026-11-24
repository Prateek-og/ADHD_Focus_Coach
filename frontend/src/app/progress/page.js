"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

function ReportHeader() {
  return (
    <header className="report-header">
      <div>
        <h1>Progress</h1>
        <p>Real data from focus sessions and feedback.</p>
      </div>
      <Link className="btn quiet sm report-back" href="/" aria-label="Back to dashboard">←</Link>
    </header>
  );
}

function InsightCard({ icon, title, primary, secondary, warn = false }) {
  return (
    <div className={`glass-card report-insight${warn ? " warn" : ""}`}>
      <div className="report-insight-head">
        <span className="report-insight-icon" aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
      </div>
      <p className="report-insight-primary">{primary}</p>
      {secondary && <p className="report-insight-secondary">{secondary}</p>}
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

  const fetchData = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // /children, /export and /feedback are caregiver-only. A child account
      // can still read /progress, /progress/summary and /tasks, so a 403 on
      // those caregiver calls must never abort the whole report.
      const childList = await listChildren(getToken).then(asList).catch(() => []);
      setChildren(childList);

      const childId = selectedChildId || childList[0]?.id || null;
      if (childId && childId !== selectedChildId) setSelectedChildId(childId);

      const [exportRes, progressRes, summaryRes, feedbackRes, tasksRes] =
        await Promise.allSettled([
          childId ? exportChild(getToken, childId) : Promise.resolve(null),
          getProgress(getToken, childId || null),
          getProgressSummary(getToken, childId || null),
          childId ? getChildFeedback(getToken, childId) : Promise.resolve([]),
          listTasks(getToken, childId || null),
        ]);

      setExportData(exportRes.status === "fulfilled" ? exportRes.value : null);
      setProgress(progressRes.status === "fulfilled" ? progressRes.value : null);
      setSummary(summaryRes.status === "fulfilled" ? summaryRes.value : null);
      setFeedback(feedbackRes.status === "fulfilled" ? asList(feedbackRes.value) : []);
      setTasks(tasksRes.status === "fulfilled" ? asList(tasksRes.value) : []);
    } catch (e) {
      // Keep the report layout visible even when the API is unavailable.
      console.warn("Could not load full report:", e.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken, selectedChildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded || loading) {
    return <main className="report-main"><div className="report-page">Loading progress…</div></main>;
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
    <main className="report-main">
      <div className="report-page">
        <ReportHeader />

        {children.length > 1 && (
          <div className="report-children">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedChildId(c.id)}
                className={`report-chip${c.id === selectedChildId ? " active" : ""}`}
              >
                {c.name || `Child #${c.id}`}
              </button>
            ))}
          </div>
        )}

        {recentSummary && <div className="glass-card report-summary">{recentSummary}</div>}

        <div className="stats report-stats">
          <div className="stat report-stat">
            <div className="v tnum">{total}</div>
            <div className="k">Total Tasks</div>
          </div>
          <div className="stat report-stat">
            <div className="v tnum">{completed}</div>
            <div className="k">Completed</div>
          </div>
          <div className="stat report-stat">
            <div className="v tnum">{summary?.current_streak ?? 0}</div>
            <div className="k">Current Streak</div>
          </div>
          <div className="stat report-stat">
            <div className="v tnum">{summary?.steps_completed ?? 0}</div>
            <div className="k">Steps Done</div>
          </div>
        </div>

        <h2 className="report-section-title">AI Insights &amp; Analytics</h2>

        <div className="report-insights">
          <InsightCard
            icon="🎯"
            title="Completion Rate"
            primary={completionPct === null ? "Abhi data nahi" : `${completionPct}%`}
            secondary={completionPct === null ? undefined : `${completed} of ${total} tasks complete`}
          />
          <InsightCard
            icon="⏳"
            title="Still To Do"
            primary={`${pending} tasks`}
            secondary={`${tasks.length} tasks loaded from backend`}
            warn={pending > 0}
          />
          <InsightCard
            icon="🧩"
            title="Steps Completed"
            primary={`${summary?.steps_completed ?? 0} steps`}
            secondary={avgMinutes ? `Avg ${avgMinutes} min from creation to finish` : undefined}
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
    </main>
  );
}
