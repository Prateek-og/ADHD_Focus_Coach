export default function ProgressPage() {
  const insights = [
    {
      id: 1, icon: '☀️', title: 'Golden Hour',
      primary: 'Tasks before 6 PM have a 78% completion rate.',
      secondary: '',
    },
    {
      id: 2, icon: '⏱️', title: 'Time Estimate Accuracy',
      primary: 'Parent estimate: 20m\nActual average: 35m',
      secondary: '',
      warn: true,
    },
    {
      id: 3, icon: '▶️', title: 'Starting vs Finishing',
      primary: 'Time to start first step: 12 mins.',
      secondary: 'High difficulty starting, but normal completion once started.',
    },
    {
      id: 4, icon: '⚠️', title: 'Where they get stuck',
      primary: 'Most sessions stop at Step 3.',
      secondary: 'Typically deferred or abandoned.',
    },
    {
      id: 5, icon: '🧩', title: 'Task Size Analysis',
      primary: '4+ step tasks are deferred 40% more often.',
      secondary: 'Parent will be warned during creation.',
    }
  ];

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Progress</h1>
      </header>

      <h2 className="text-2xl font-bold mt-8 mb-4">AI Insights & Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {insights.map(item => (
          <div key={item.id} className="glass-card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-heading text-xl font-bold text-text-main">{item.title}</h3>
            </div>
            
            <p className={`font-body text-lg leading-relaxed ${item.warn ? 'text-warn-ink font-bold' : 'text-text-main'}`}>
              {item.primary.split('\n').map((line, i) => (
                <span key={i}>{line}<br/></span>
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
