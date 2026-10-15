export default function TasksPage() {
  const tasks = [
    {
      id: '1',
      title: 'Tidy your room',
      desc: 'Before dinner',
      minutes: 15,
      at: '17:30',
      priority: 'Normal',
      recur: 'Daily',
      reward: '10 min game time',
      steps: 4
    },
    {
      id: '2',
      title: 'Finish maths worksheet',
      desc: 'Questions 1 to 6',
      minutes: 20,
      at: '18:15',
      priority: 'High',
      recur: 'Weekdays',
      reward: '',
      steps: 4
    }
  ];

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Tasks</h1>
        <button className="px-6 py-3 bg-primary text-white font-heading font-extrabold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 w-fit">
          + New Task
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map(t => (
          <div key={t.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-text-main mb-2">{t.title}</h2>
              <div className="text-sm font-bold text-text-muted mb-4">
                {t.at} • {t.minutes} min • {t.recur} • {t.priority}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-extrabold uppercase">
                  {t.steps} steps
                </span>
                {t.reward && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold uppercase flex items-center gap-1">
                    <span>🏆</span> {t.reward}
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
