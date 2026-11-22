'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import {
  getTask,
  getTaskSteps,
  startFocus,
  getFocusState,
  completeStep,
  handleStuck,
  takeBreak,
  resumeFocus,
  letsGo,
  submitFeedback,
} from '@/lib/api';

// ─── Buddy Avatar ────────────────────────────────────────────────────────────
function Eye({ type, cx, cy }) {
  if (type === 'circle') return <circle cx={cx} cy={cy} r="5" fill="#451A03" />;
  if (type === 'arc')    return <path d={`M${cx-5} ${cy} Q${cx} ${cy-6} ${cx+5} ${cy}`} stroke="#451A03" strokeWidth="2.5" fill="none" strokeLinecap="round"/>;
  if (type === 'squint') return <line x1={cx-5} y1={cy} x2={cx+5} y2={cy} stroke="#451A03" strokeWidth="2.5" strokeLinecap="round"/>;
  if (type === 'star')   return <text x={cx-6} y={cy+5} fontSize="12" fill="#f59e0b">★</text>;
  if (type === 'half')   return <path d={`M${cx-5} ${cy-1} Q${cx} ${cy+5} ${cx+5} ${cy-1}`} stroke="#451A03" strokeWidth="2.5" fill="none"/>;
  return <circle cx={cx} cy={cy} r="5" fill="#451A03" />;
}

function BuddyAvatar({ mood = 'idle' }) {
  // moods: idle | happy | thinking | excited | sleepy | break
  const moodColors = {
    idle:     { body: '#FFE4B5', ear: '#f59e0b' },
    happy:    { body: '#FFF9C4', ear: '#f59e0b' },
    thinking: { body: '#E8EAF6', ear: '#7986CB' },
    excited:  { body: '#FFF3E0', ear: '#FF9800' },
    sleepy:   { body: '#F3E5F5', ear: '#AB47BC' },
    break:    { body: '#E8F5E9', ear: '#66BB6A' },
  };
  const c = moodColors[mood] || moodColors.idle;

  // Eye expressions
  const eyes = {
    idle:     { left: 'circle', right: 'circle' },
    happy:    { left: 'arc',    right: 'arc'    },
    thinking: { left: 'circle', right: 'squint' },
    excited:  { left: 'star',   right: 'star'   },
    sleepy:   { left: 'half',   right: 'half'   },
    break:    { left: 'arc',    right: 'arc'    },
  }[mood] || { left: 'circle', right: 'circle' };

  return (
    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 8px' }}>
      <svg viewBox="0 0 120 120" width="120" height="120" aria-label="Buddy the Dog">
        <ellipse cx="60" cy="112" rx="35" ry="6" fill="currentColor" opacity="0.1" />
        {/* Ears */}
        <path d="M30 45C15 25 5 50 15 75Q25 65 35 60Z" fill={c.ear} />
        <path d="M90 45C105 25 115 50 105 75Q95 65 85 60Z" fill={c.ear} />
        {/* Head */}
        <path d="M30 45C30 15 90 15 90 45 100 75 85 95 60 95 35 95 20 75 30 45Z" fill={c.body} />
        {/* Left ear patch */}
        <path d="M25 45C25 35 50 35 50 50 50 65 30 65 25 45Z" fill={c.ear} />
        {/* Eyes */}
        <Eye type={eyes.left}  cx={38} cy={50} />
        <Eye type={eyes.right} cx={82} cy={50} />
        {/* Eye shine */}
        {mood !== 'sleepy' && <><circle cx="36.5" cy="47" r="1.5" fill="#fff" /><circle cx="80.5" cy="47" r="1.5" fill="#fff" /></>}
        {/* Muzzle */}
        <ellipse cx="60" cy="72" rx="22" ry="16" fill="#FFF8DC" />
        {/* Nose */}
        <path d="M52 65Q60 62 68 65C68 76 52 76 52 65" fill="#451A03" />
        {/* Smile */}
        {(mood === 'happy' || mood === 'excited' || mood === 'break') && (
          <path d="M50 78C55 86 65 86 70 78" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}
        {/* Thinking dots */}
        {mood === 'thinking' && (
          <>
            <circle cx="90" cy="30" r="4" fill="#7986CB" opacity="0.7" />
            <circle cx="100" cy="22" r="3" fill="#7986CB" opacity="0.5" />
            <circle cx="108" cy="16" r="2" fill="#7986CB" opacity="0.3" />
          </>
        )}
        {/* Excited sparkles */}
        {mood === 'excited' && (
          <>
            <text x="8" y="30" fontSize="14">✨</text>
            <text x="95" y="30" fontSize="14">✨</text>
          </>
        )}
        {/* Zzz for sleepy */}
        {mood === 'sleepy' && <text x="85" y="25" fontSize="14" fill="#AB47BC">💤</text>}
      </svg>
    </div>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────
function SpeechBubble({ message, color = '#6366f1' }) {
  if (!message) return null;
  return (
    <div style={{
      background: `${color}15`,
      border: `2px solid ${color}40`,
      borderRadius: 16,
      padding: '12px 18px',
      maxWidth: 320,
      margin: '0 auto 16px',
      position: 'relative',
      textAlign: 'center',
      fontWeight: 700,
      color: '#1e293b',
      fontSize: '1rem',
      lineHeight: 1.5,
    }}>
      {message}
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: `12px solid ${color}40`,
      }} />
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ step, isCurrent, isCompleted }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px',
      borderRadius: 14,
      background: isCompleted ? '#f0fdf4' : isCurrent ? '#eef2ff' : '#f8fafc',
      border: `2px solid ${isCompleted ? '#86efac' : isCurrent ? '#a5b4fc' : '#e2e8f0'}`,
      marginBottom: 10,
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isCompleted ? '#22c55e' : isCurrent ? '#6366f1' : '#e2e8f0',
        color: isCompleted || isCurrent ? 'white' : '#94a3b8',
        fontWeight: 800, fontSize: 14,
      }}>
        {isCompleted ? '✓' : step.position}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 700, color: isCompleted ? '#15803d' : isCurrent ? '#3730a3' : '#64748b',
          textDecoration: isCompleted ? 'line-through' : 'none',
          fontSize: '0.95rem',
        }}>
          {step.instruction || step.title || step.description}
        </div>
        {step.hint && isCurrent && (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>💡 {step.hint}</div>
        )}
      </div>
      {isCurrent && <div style={{ fontSize: 20 }}>👆</div>}
    </div>
  );
}

// ─── Feedback Modal ───────────────────────────────────────────────────────────
const FEEDBACK_QUESTIONS = [
  {
    key: 'task_difficulty',
    question: 'Task kaisa tha?',
    options: [
      { value: 'SUPER_EASY', label: 'Bohot aasan' },
      { value: 'A_LITTLE_EASY', label: 'Thoda aasan' },
      { value: 'JUST_OKAY', label: 'Theek tha' },
      { value: 'A_LITTLE_DIFFICULT', label: 'Thoda mushkil' },
      { value: 'VERY_DIFFICULT', label: 'Bohot mushkil' },
    ],
  },
  {
    key: 'hardest_part',
    question: 'Sabse mushkil hissa kya tha?',
    options: [
      { value: 'GETTING_STARTED', label: 'Shuru karna' },
      { value: 'UNDERSTANDING', label: 'Samajhna' },
      { value: 'STAYING_FOCUSED', label: 'Dhyan rakhna' },
      { value: 'REMEMBERING_NEXT_STEP', label: 'Agla step yaad rakhna' },
      { value: 'NOTHING_DIFFICULT', label: 'Kuch bhi nahi' },
    ],
  },
  {
    key: 'helped_by',
    question: 'Kya madad mili?',
    options: [
      { value: 'SMALL_STEPS', label: 'Chhote steps' },
      { value: 'TIMER', label: 'Timer' },
      { value: 'ENCOURAGEMENT', label: 'Encouragement' },
      { value: 'SHORT_BREAKS', label: 'Chhote breaks' },
      { value: 'QUIET_SPACE', label: 'Quiet space' },
    ],
  },
  {
    key: 'instruction_clarity',
    question: 'Instructions saaf the?',
    options: [
      { value: 'VERY_CLEAR', label: 'Bohot saaf' },
      { value: 'MOSTLY_CLEAR', label: 'Zyada tar saaf' },
      { value: 'NEEDED_EXPLANATION', label: 'Samajhna pada' },
      { value: 'NEEDED_REPETITION', label: 'Dobara samjhana pada' },
      { value: 'UNCLEAR', label: 'Saaf nahi the' },
    ],
  },
  {
    key: 'focus_level',
    question: 'Kitna focus hua?',
    options: [
      { value: 'ALMOST_WHOLE_TIME', label: 'Lagbhag poora' },
      { value: 'MOST_OF_THE_TIME', label: 'Zyada tar' },
      { value: 'SOMETIMES', label: 'Kabhi kabhi' },
      { value: 'LITTLE_OF_THE_TIME', label: 'Thoda sa' },
      { value: 'HARD_TO_FOCUS', label: 'Focus mushkil' },
    ],
  },
  {
    key: 'when_stuck',
    question: 'Stuck hone par kya kiya?',
    options: [
      { value: 'TRIED_AGAIN', label: 'Dobara try kiya' },
      { value: 'CHECKED_INSTRUCTIONS', label: 'Instructions dekhe' },
      { value: 'ASKED_FOR_HELP', label: 'Madad maangi' },
      { value: 'TOOK_A_BREAK', label: 'Break liya' },
      { value: 'DID_NOT_KNOW_WHAT_TO_DO', label: 'Nahi pata tha' },
    ],
  },
  {
    key: 'next_time',
    question: 'Agli baar kya chahiye?',
    options: [
      { value: 'SMALLER_STEPS', label: 'Chhote steps' },
      { value: 'TIMER', label: 'Timer' },
      { value: 'MORE_BREAKS', label: 'Zyada breaks' },
      { value: 'MORE_ENCOURAGEMENT', label: 'Zyada encouragement' },
      { value: 'NO_CHANGE', label: 'Kuch nahi' },
    ],
  },
];

function FeedbackModal({ taskId, onClose, getToken }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const submit = async () => {
    if (answeredCount === 0) return;
    setSubmitting(true);
    try {
      await submitFeedback(getToken, taskId, answers);
    } catch {}
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: 28,
        maxWidth: 400, width: '92%', textAlign: 'center',
      }}>
        <BuddyAvatar mood="excited" />
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 6 }}>🎉 Task Complete!</h2>
        <p style={{ color: '#64748b', marginBottom: 16, fontSize: '0.9rem' }}>
          Buddy ko batavo — 7 chhote sawal. Jo nahi chahiye, skip kar do.
        </p>
        <div style={{ maxHeight: '52vh', overflowY: 'auto', textAlign: 'left', marginBottom: 16, paddingRight: 4 }}>
          {FEEDBACK_QUESTIONS.map(q => (
            <div key={q.key} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 6, color: '#334155' }}>
                {q.question}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.options.map(opt => {
                  const selected = answers[q.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.key]: selected ? null : opt.value }))}
                      style={{
                        padding: '6px 10px', borderRadius: 99, border: `2px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
                        background: selected ? '#eef2ff' : 'white', fontWeight: 700, fontSize: '0.78rem',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #e2e8f0',
            background: 'white', fontWeight: 700, cursor: 'pointer',
          }}>Skip</button>
          <button onClick={submit} disabled={answeredCount === 0 || submitting} style={{
            flex: 2, padding: '12px', borderRadius: 12, border: 'none',
            background: answeredCount ? '#6366f1' : '#e2e8f0', color: answeredCount ? 'white' : '#94a3b8',
            fontWeight: 800, cursor: answeredCount ? 'pointer' : 'default', fontSize: '1rem',
          }}>
            {submitting ? 'Saving…' : `Done! 🐾${answeredCount ? ` (${answeredCount})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Focus Page ──────────────────────────────────────────────────────────
export default function FocusPage() {
  const { taskId } = useParams();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [task, setTask]           = useState(null);
  const [steps, setSteps]         = useState([]);
  const [focusState, setFocusState] = useState(null); // { focus_state, task_status, current_step, current_step_position }
  const [phase, setPhase]         = useState('loading'); // loading | not_started | active | break | stuck | completed | error
  const [buddyMood, setBuddyMood] = useState('idle');
  const [buddyMsg, setBuddyMsg]   = useState('');
  const [stuckReason, setStuckReason] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]         = useState('');
  const pollRef = useRef(null);

  // ── Poll focus state ─────────────────────────────────────────
  const pollState = useCallback(async () => {
    try {
      const fs = await getFocusState(getToken, taskId);
      setFocusState(fs);
      const st = fs.focus_state?.split('.').pop().toUpperCase();
      if (st === 'INACTIVE') {
        setBuddyMood('sleepy');
        setBuddyMsg('Kya hua? Chalte hain! 👋');
      } else if (st === 'BREAK') {
        setBuddyMood('break');
        setBuddyMsg('Break le le. Wapas aane pe ready! ☕');
      } else if (st === 'COMPLETED') {
        setBuddyMood('excited');
        setBuddyMsg('Wah! Tune kar diya! 🎉');
      } else if (st === 'ACTIVE') {
        setBuddyMood('happy');
      }
    } catch {}
  }, [getToken, taskId]);

  // ── Load task + steps ────────────────────────────────────────
  const loadTask = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      const [t, s] = await Promise.all([
        getTask(getToken, taskId),
        getTaskSteps(getToken, taskId),
      ]);
      setTask(t);
      setSteps(s);

      const taskStatus = t.status?.split('.').pop().toUpperCase();
      const fsState = t.focus_state?.split('.').pop().toUpperCase();

      if (taskStatus === 'COMPLETED' || fsState === 'COMPLETED') {
        setPhase('completed');
        setBuddyMood('excited');
        setBuddyMsg('Wah! Tune kar diya! 🎉');
      } else if (fsState === 'BREAK') {
        setPhase('break');
        setBuddyMood('break');
        setBuddyMsg('Break le le. Wapas aane pe ready! ☕');
      } else if (fsState === 'ACTIVE' || fsState === 'INACTIVE') {
        setPhase('active');
        setBuddyMood(fsState === 'INACTIVE' ? 'sleepy' : 'happy');
        setBuddyMsg(fsState === 'INACTIVE' ? 'Kya hua? Chalte hain! 👋' : 'Chalo! Ek step karo! 💪');
        await pollState();
      } else {
        if (s.length === 0) {
          setPhase('no_steps');
          setBuddyMood('thinking');
          setBuddyMsg('Pehle AI se steps banao! 🤖');
        } else {
          setPhase('not_started');
          setBuddyMood('idle');
          setBuddyMsg(`${s.length} steps ready hain. Shuru karein? 🐾`);
        }
      }
    } catch (e) {
      setError(e.message); setPhase('error');
    }
  }, [isLoaded, isSignedIn, getToken, taskId, pollState]);

  useEffect(() => { loadTask(); }, [loadTask]);

  useEffect(() => {
    if (phase === 'active') {
      pollRef.current = setInterval(pollState, 5000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [phase, pollState]);

  // ── Actions ──────────────────────────────────────────────────
  const doStart = async () => {
    setActionLoading(true); setError('');
    try {
      await startFocus(getToken, taskId);
      setPhase('active'); setBuddyMood('happy');
      setBuddyMsg('Badhiya! Pehla step karo! 🐾');
      await pollState();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const currentStep =
    focusState?.current_step ||
    steps.find(s => s.position === focusState?.current_step_position) ||
    steps.find(s => s.status !== 'COMPLETED');
  const completedCount = steps.filter(s => s.status === 'COMPLETED').length;

  const doDone = async () => {
    if (!currentStep) return;
    setActionLoading(true); setError('');
    try {
      const res = await completeStep(getToken, taskId, currentStep.id, currentStep.position);
      const outcome = res.result?.split('.').pop().toUpperCase();
      if (outcome === 'TASK_COMPLETED') {
        setPhase('completed'); setBuddyMood('excited');
        setBuddyMsg('AMAZING! Sab kuch ho gaya! 🎉🏆');
        setShowFeedback(true);
      } else {
        setBuddyMood('happy');
        setBuddyMsg('Shandaar! Agla step! 💪');
      }
      await loadTask();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const doStuck = async () => {
    if (!currentStep) return;
    setActionLoading(true); setError('');
    try {
      const res = await handleStuck(getToken, taskId, currentStep.id, stuckReason || 'CONFUSED', currentStep.position);
      setBuddyMood('thinking');
      setBuddyMsg(res.message || 'Koi baat nahi! Dekho yeh try karo 👇');
      setPhase('active');
      setStuckReason('');
      await loadTask();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const doBreak = async () => {
    setActionLoading(true);
    try {
      await takeBreak(getToken, taskId);
      setPhase('break'); setBuddyMood('break');
      setBuddyMsg('Break time! ☕ Jab tayyar ho wapas aana!');
      await pollState();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const doResume = async () => {
    setActionLoading(true);
    try {
      await resumeFocus(getToken, taskId);
      setPhase('active'); setBuddyMood('happy');
      setBuddyMsg('Wapas aa gaye! Chalo! 💪');
      await pollState();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const doLetsGo = async () => {
    setActionLoading(true);
    try {
      await letsGo(getToken, taskId);
      setPhase('active'); setBuddyMood('happy');
      setBuddyMsg('Chalo chalo! 🚀');
      await pollState();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────
  if (!isLoaded || phase === 'loading') {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>;
  }

  if (phase === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button onClick={() => router.push('/tasks')} style={btnStyle('#6366f1')}>← Tasks pe Wapas</button>
      </div>
    );
  }

  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.push('/tasks')} style={{
          background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6366f1',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{task?.title || 'Focus Session'}</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{task?.estimated_minutes || '?'} min · {steps.length} steps</p>
        </div>
      </div>

      {/* Progress Bar */}
      {steps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
            <span>{completedCount}/{steps.length} steps</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99 }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #6366f1, #f59e0b)',
              borderRadius: 99, width: `${progress}%`, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Buddy + Message */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <BuddyAvatar mood={buddyMood} />
        <SpeechBubble message={buddyMsg} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fff1f2', color: '#9f1239', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontWeight: 600, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* ── NOT STARTED ── */}
      {phase === 'not_started' && (
        <>
          <div style={{ marginBottom: 16 }}>
            {steps.map(s => <StepCard key={s.id} step={s} isCurrent={false} isCompleted={false} />)}
          </div>
          <button onClick={doStart} disabled={actionLoading} style={btnStyle('#6366f1', actionLoading)}>
            {actionLoading ? 'Starting…' : '🚀 Shuru Karo!'}
          </button>
        </>
      )}

      {/* ── NO STEPS (need breakdown first) ── */}
      {phase === 'no_steps' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Is task ke liye AI se steps generate karo pehle.</p>
          <button onClick={() => router.push('/tasks')} style={btnStyle('#6366f1')}>Tasks pe Jao → AI Breakdown</button>
        </div>
      )}

      {/* ── ACTIVE ── */}
      {phase === 'active' && (
        <>
          <div style={{ marginBottom: 16 }}>
            {steps.map(s => (
              <StepCard
                key={s.id}
                step={s}
                isCurrent={s.id === currentStep?.id}
                isCompleted={s.status === 'COMPLETED'}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={doDone} disabled={actionLoading || !currentStep} style={btnStyle('#22c55e', actionLoading || !currentStep)}>
              ✅ Ho Gaya!
            </button>
            <button onClick={() => setPhase('stuck')} disabled={actionLoading} style={btnStyle('#f59e0b', actionLoading)}>
              😕 Stuck Hoon
            </button>
            <button onClick={doBreak} disabled={actionLoading} style={{ ...btnStyle('#e2e8f0', actionLoading), color: '#475569' }}>
              ☕ Break
            </button>
          </div>
        </>
      )}

      {/* ── STUCK ── */}
      {phase === 'stuck' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 12, color: '#475569' }}>Buddy se madad maango! Kya hua?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { value: 'CONFUSED',   label: '🤔 Samajh nahi aaya' },
              { value: 'TOO_HARD',   label: '😓 Bahut mushkil' },
              { value: 'NEED_BREAK', label: '☕ Break chahiye' },
              { value: 'TOO_LONG',   label: '😵 Bahut lamba hai' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setStuckReason(opt.value)} style={{
                padding: '12px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
                border: `2px solid ${stuckReason === opt.value ? '#6366f1' : '#e2e8f0'}`,
                background: stuckReason === opt.value ? '#eef2ff' : 'white',
                cursor: 'pointer',
              }}>{opt.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setPhase('active'); setStuckReason(''); }} style={{ ...btnStyle('#e2e8f0'), color: '#475569' }}>
              Cancel
            </button>
            <button onClick={doStuck} disabled={!stuckReason || actionLoading} style={btnStyle('#6366f1', !stuckReason || actionLoading)}>
              {actionLoading ? 'Buddy soch raha hai…' : '🤖 Buddy Help Karo!'}
            </button>
          </div>
        </div>
      )}

      {/* ── BREAK ── */}
      {phase === 'break' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: 20 }}>Aaram karo. Wapas aane pe Buddy ready hai! 🐶</p>
          <button onClick={doResume} disabled={actionLoading} style={btnStyle('#22c55e', actionLoading)}>
            {actionLoading ? 'Resuming…' : '💪 Wapas Shuru Karo!'}
          </button>
        </div>
      )}

      {/* ── INACTIVE prompt ── */}
      {phase === 'active' && focusState?.focus_state === 'INACTIVE' && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={doLetsGo} style={btnStyle('#f59e0b')}>⚡ Let&apos;s Go!</button>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {phase === 'completed' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>Task Complete!</h2>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Tune itne acche se kiya! Buddy proud hai! 🐾</p>
          <button onClick={() => router.push('/tasks')} style={btnStyle('#6366f1')}>← Baaki Tasks Dekho</button>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <FeedbackModal
          taskId={taskId}
          getToken={getToken}
          onClose={() => { setShowFeedback(false); router.push('/tasks'); }}
        />
      )}
    </div>
  );
}

function btnStyle(bg, disabled = false) {
  return {
    flex: 1, padding: '14px 20px', borderRadius: 14, border: 'none',
    background: disabled ? '#e2e8f0' : bg,
    color: disabled ? '#94a3b8' : (bg === '#e2e8f0' ? '#475569' : 'white'),
    fontWeight: 800, fontSize: '1rem', cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.2s', minWidth: 100,
  };
}
