"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { listChildren, createTask, listTasks, deleteTask, breakdownTask, getTaskSteps } from "@/lib/api";

// ─── Create Task Modal ────────────────────────────────────────
function CreateTaskModal({ children, onClose, onCreated, getToken }) {
  const [form, setForm] = useState({
    child_id: children[0]?.id || '',
    title: '',
    estimated_minutes: 20,
    scheduled_time: '',
    priority: 'NORMAL',
    recurrence: 'NONE',
    reward: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { createTask: ct } = await import('@/lib/api');
      await ct(getToken, {
        child_id: Number(form.child_id),
        title: form.title.trim(),
        estimated_minutes: Number(form.estimated_minutes),
        scheduled_time: form.scheduled_time || null,
        priority: form.priority,
        recurrence: form.recurrence,
        reward: form.reward.trim() || null,
      });
      onCreated();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 600, fontSize: '0.95rem', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 20 }}>+ Naya Task Banao</h2>
        {error && <div style={{ background: '#fff1f2', color: '#9f1239', padding: '8px 12px', borderRadius: 10, marginBottom: 12, fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Child</label>
            <select value={form.child_id} onChange={e => setForm({...form, child_id: e.target.value})} style={inp}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Task ka naam *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Homework karo" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Time (min)</label>
              <input type="number" min="1" max="180" value={form.estimated_minutes} onChange={e => setForm({...form, estimated_minutes: e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={inp}>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Scheduled Time (optional)</label>
            <input type="datetime-local" value={form.scheduled_time} onChange={e => setForm({...form, scheduled_time: e.target.value})} style={inp} />
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Reward 🏆 (optional)</label>
            <input value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} placeholder="e.g. 30 min gaming" style={inp} />
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>Recurrence</label>
            <select value={form.recurrence} onChange={e => setForm({...form, recurrence: e.target.value})} style={inp}>
              <option value="NONE">Ek baar</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKDAYS">Weekdays</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: saving ? '#e2e8f0' : '#6366f1', color: saving ? '#94a3b8' : 'white', fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Ban raha hai…' : '✅ Task Banao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Breakdown Modal ──────────────────────────────────────────
function BreakdownModal({ task, steps, loading, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, maxWidth: 400, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 4 }}>🤖 AI Steps</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>{task?.title}</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#6366f1', fontWeight: 700 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
            AI steps bana raha hai…
          </div>
        ) : steps.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Koi steps nahi mile.</p>
        ) : (
          <div>
            {steps.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i+1}</div>
                <div style={{ fontWeight: 600, paddingTop: 4 }}>{s.instruction || s.title || s.description}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: 'none', background: '#6366f1', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
          Theek Hai! ✓
        </button>
      </div>
    </div>
  );
}

// ─── Main Tasks Page ──────────────────────────────────────────
export default function TasksPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [tasks, setTasks]           = useState([]);
  const [children, setChildren]     = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [breakdown, setBreakdown]   = useState({ show: false, task: null, steps: [], loading: false });
  const [deleting, setDeleting]     = useState(null);

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true); setError("");
    try {
      const childrenData = await listChildren(getToken);
      const childList = Array.isArray(childrenData) ? childrenData : childrenData?.children || [];
      setChildren(childList);
      const childId = selectedChildId || (childList[0]?.id || null);
      if (childId) {
        setSelectedChildId(childId);
        try {
          const taskData = await listTasks(getToken, childId);
          setTasks(Array.isArray(taskData) ? taskData : taskData?.tasks || []);
        } catch (e) {
          if (/404|405/.test(e.message)) setTasks([]);
          else throw e;
        }
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isLoaded, isSignedIn, getToken, selectedChildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (taskId) => {
    if (!confirm('Is task ko delete karna chahte ho?')) return;
    setDeleting(taskId);
    try {
      await deleteTask(getToken, taskId);
      setTasks(t => t.filter(x => x.id !== taskId));
    } catch (e) { setError(e.message); }
    finally { setDeleting(null); }
  };

  const handleBreakdown = async (task) => {
    setBreakdown({ show: true, task, steps: [], loading: true });
    try {
      // First try fetching existing steps
      let steps = await getTaskSteps(getToken, task.id);
      if (!steps || steps.length === 0) {
        // No steps yet — call AI breakdown
        steps = await breakdownTask(getToken, task.id, `breakdown-${task.id}-${Date.now()}`);
      }
      setBreakdown(b => ({ ...b, steps, loading: false }));
    } catch (e) {
      setBreakdown(b => ({ ...b, loading: false }));
      setError(e.message);
    }
  };

  const statusBadge = (status) => {
    const s = (status || '').split('.').pop().toUpperCase();
    const map = {
      PENDING:     { bg: '#f1f5f9', color: '#475569', label: 'Pending' },
      IN_PROGRESS: { bg: '#eef2ff', color: '#4338ca', label: 'In Progress' },
      COMPLETED:   { bg: '#f0fdf4', color: '#15803d', label: 'Done ✓' },
      BREAK:       { bg: '#fef9c3', color: '#a16207', label: 'Break ☕' },
    };
    const st = map[s] || map.PENDING;
    return <span style={{ padding: '4px 10px', borderRadius: 99, background: st.bg, color: st.color, fontWeight: 700, fontSize: '0.75rem' }}>{st.label}</span>;
  };

  if (!isLoaded || loading) return <div className="p-8 text-center">Loading tasks…</div>;

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Tasks</h1>
        {children.length > 0 && (
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-primary text-white font-heading font-extrabold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 w-fit">
            + Naya Task
          </button>
        )}
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChildId(c.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${c.id === selectedChildId ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl font-bold text-sm">{error}</div>}

      {/* Task List */}
      {tasks.length === 0 && !error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-text-muted">
            {children.length === 0 ? 'Pehle ek child profile banao.' : 'Koi task nahi hai. Naya task banao!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(t => (
            <div key={t.id} className="glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-extrabold text-text-main">{t.title}</h2>
                    {statusBadge(t.status)}
                  </div>
                  <div className="text-sm font-bold text-text-muted mb-3">
                    {t.estimated_minutes || '?'} min
                    {t.scheduled_time ? ` · ${new Date(t.scheduled_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                    {t.recurrence && t.recurrence !== 'NONE' ? ` · ${t.recurrence}` : ''}
                    {t.priority && t.priority !== 'NORMAL' ? ` · ${t.priority}` : ''}
                  </div>
                  {t.reward && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold">🏆 {t.reward}</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleBreakdown(t)}
                    className="px-3 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors text-sm">
                    🤖 AI Steps
                  </button>
                  <button onClick={() => router.push(`/focus/${t.id}`)}
                    className="px-3 py-2 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 transition-colors text-sm">
                    ▶ Focus
                  </button>
                  <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                    className="px-3 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm disabled:opacity-50">
                    {deleting === t.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && children.length > 0 && (
        <CreateTaskModal
          children={children}
          getToken={getToken}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
      {breakdown.show && (
        <BreakdownModal
          task={breakdown.task}
          steps={breakdown.steps}
          loading={breakdown.loading}
          onClose={() => setBreakdown({ show: false, task: null, steps: [], loading: false })}
        />
      )}
    </div>
  );
}
