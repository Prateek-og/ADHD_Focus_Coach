"use client";

import { useState } from 'react';

export default function ChildProfilePage() {
  const [formData, setFormData] = useState({
    name: 'Aarav',
    age: '8',
    klass: 'Class 3',
    description: 'Loves dogs. Gets stuck when a task feels big.',
  });

  const preferences = ['Small steps', 'Encouragement'];

  const handleSave = (e) => {
    e.preventDefault();
    // Simulate save
    alert('Profile saved!');
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Child Profile</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Edit Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-text-muted ml-1">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted ml-1">Age</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-muted ml-1">Class</label>
              <input 
                type="text" 
                value={formData.klass}
                onChange={e => setFormData({...formData, klass: e.target.value})}
                className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-muted ml-1">What should the coach know?</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>

            <button 
              type="submit"
              className="px-8 py-4 bg-primary text-white font-heading font-extrabold text-lg rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* AI Learned Preferences */}
        <div className="glass-card p-8 h-fit">
          <h2 className="text-2xl font-extrabold mb-6">What the coach has learned</h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {preferences.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-bold">
                {p}
                <button className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center hover:bg-purple-300 transition-colors">
                  &times;
                </button>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-text-muted leading-relaxed">
            Kept to three at most, counted from the child's answers during Focus sessions. You can remove any of them if they are no longer relevant.
          </p>
        </div>
      </div>
    </div>
  );
}
