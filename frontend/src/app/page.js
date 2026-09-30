export default function Home() {
  const streak = 5;
  const finishedThisWeek = 12;
  const pending = 2;
  
  const tasks = [
    { id: 1, title: 'Tidy your room', at: '17:30', done: false, priority: 'Normal' },
    { id: 2, title: 'Finish maths worksheet', at: '18:15', done: true, priority: 'High' }
  ];

  const notes = [
    { id: 1, type: 'TASK REMINDER', msg: 'Tidy your room starts in 15 minutes.', when: '17:15', read: false },
    { id: 2, type: 'CAREGIVER UPDATE', msg: 'Aarav finished Finish maths worksheet.', when: 'Just now', read: true }
  ];

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Today</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value={streak} label="Day Streak" />
        <StatCard value={finishedThisWeek} label="Finished this week" />
        <StatCard value={pending} label="Still to do" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Today's Tasks */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-extrabold">Today's tasks</h2>
            <button className="px-4 py-2 bg-slate-100 rounded-full text-sm font-bold shadow-sm hover:bg-white transition-colors">Manage</button>
          </div>
          
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${t.done ? 'bg-ok text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {t.at}
                </span>
                <span className="font-bold flex-1">{t.title}</span>
                {t.done ? (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-ok text-white">Done</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-slate-100 text-slate-500">{t.priority}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-extrabold">Recent updates</h2>
            <button className="text-sm font-bold text-text-muted hover:text-text-main">Mark all read</button>
          </div>
          
          <div className="space-y-4">
            {notes.map(n => (
              <div key={n.id} className={`flex gap-4 border-b border-black/5 pb-4 last:border-0 last:pb-0 ${n.read ? 'opacity-60' : ''}`}>
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-400' : 'bg-primary shadow-[0_0_8px_var(--color-primary)]'}`} />
                <div>
                  <div className="font-bold mb-1">{n.msg}</div>
                  <div className="text-sm text-text-muted capitalize">{n.type.toLowerCase()} • {n.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 text-center flex flex-col items-center justify-center">
      <div className="font-heading text-5xl md:text-6xl font-extrabold text-primary-dark mb-2">{value}</div>
      <div className="text-sm font-extrabold uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}
