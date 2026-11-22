"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { listChildren, updateChild, createChild } from "@/lib/api";

export default function ChildProfilePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    klass: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [newChild, setNewChild] = useState({ name: "", age: 8, klass: "Class 3", description: "" });

  const preferences = ["Small steps", "Encouragement"];

  const handleCreateChild = async (e) => {
    e.preventDefault();
    if (!newChild.name.trim()) return;
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const clean = newChild.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = `${clean || "child"}_${Math.floor(1000 + Math.random() * 9000)}`;
      const password = `ChildPass#2026!_${Math.random().toString(36).substring(2, 7)}`;
      await createChild(getToken, {
        name: newChild.name.trim(),
        age: Number(newChild.age) || 8,
        class_name: newChild.klass.trim() || "Class 3",
        description: newChild.description.trim() || null,
        username,
        password,
      });
      setStatus("Child profile created successfully!");
      setShowCreateChild(false);
      setNewChild({ name: "", age: 8, klass: "Class 3", description: "" });
      await fetchChildren();
    } catch (err) {
      setError(err.message || "Could not create child profile.");
    } finally {
      setSaving(false);
    }
  };

  // Load children from backend
  const fetchChildren = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError("");
    try {
      const data = await listChildren(getToken);
      const items = Array.isArray(data) ? data : data?.items || data?.children || [];
      setChildren(items);

      // Auto-select the first child
      if (items.length > 0 && !selectedChildId) {
        const first = items[0];
        setSelectedChildId(first.id);
        setFormData({
          name: first.name || "",
          age: String(first.age || ""),
          klass: first.class_name || "",
          description: first.description || "",
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken, selectedChildId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // When user selects a different child
  const selectChild = (child) => {
    setSelectedChildId(child.id);
    setFormData({
      name: child.name || "",
      age: String(child.age || ""),
      klass: child.class_name || "",
      description: child.description || "",
    });
    setStatus("");
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedChildId) return;

    setSaving(true);
    setStatus("");
    setError("");

    try {
      await updateChild(getToken, selectedChildId, {
        name: formData.name.trim(),
        age: Number(formData.age),
        class_name: formData.klass.trim(),
        description: formData.description.trim() || null,
      });
      setStatus("Profile saved!");
      // Refresh the list
      await fetchChildren();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return <div className="p-8 text-center">Loading…</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">Loading children…</div>;
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main">Child Profile</h1>
        <button
          onClick={() => setShowCreateChild(!showCreateChild)}
          className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
        >
          {showCreateChild ? "Close" : "+ Add Child"}
        </button>
      </header>

      {/* Create Child Modal / Card */}
      {(showCreateChild || children.length === 0) && (
        <div className="glass-card p-8 mb-8 border-2 border-primary/20">
          <h2 className="text-2xl font-extrabold text-text-main mb-2">🧒 Create Child Profile</h2>
          <p className="text-text-muted mb-6">Enter your child&apos;s details so Focus Buddy can tailor the tasks and motivation.</p>
          <form onSubmit={handleCreateChild} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-bold text-text-muted">Child&apos;s Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-3 text-lg font-bold focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-text-muted">Age *</label>
                <input
                  type="number"
                  min="3"
                  max="18"
                  required
                  value={newChild.age}
                  onChange={(e) => setNewChild({ ...newChild, age: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-3 text-lg font-bold focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-text-muted">Class / Grade</label>
              <input
                type="text"
                value={newChild.klass}
                onChange={(e) => setNewChild({ ...newChild, klass: e.target.value })}
                className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-3 text-lg font-bold focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-text-muted">What should Coach Buddy know about your child?</label>
              <textarea
                rows={3}
                placeholder="e.g. Gets overwhelmed with large tasks, loves dogs, needs short breaks"
                value={newChild.description}
                onChange={(e) => setNewChild({ ...newChild, description: e.target.value })}
                className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-3 text-base focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 bg-primary text-white font-extrabold text-lg rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {saving ? "Creating Profile…" : "🚀 Create Child Profile"}
            </button>
          </form>
        </div>
      )}

      {/* Child selector (if multiple) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChild(c)}
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

      {children.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-text-muted">
            No children linked to your account yet. Create a child account from the dashboard.
          </p>
        </div>
      )}

      {/* Status / Error */}
      {status && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl font-bold text-sm">
          {status}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl font-bold text-sm">{error}</div>
      )}

      {selectedChildId && (
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-text-muted ml-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted ml-1">Class</label>
                <input
                  type="text"
                  value={formData.klass}
                  onChange={(e) => setFormData({ ...formData, klass: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg font-bold focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-text-muted ml-1">
                  What should the coach know?
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-black/10 rounded-2xl p-4 text-lg focus:border-primary focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-8 py-4 bg-primary text-white font-heading font-extrabold text-lg rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </form>
          </div>

          {/* AI Learned Preferences */}
          <div className="glass-card p-8 h-fit">
            <h2 className="text-2xl font-extrabold mb-6">What the coach has learned</h2>

            <div className="flex flex-wrap gap-3 mb-6">
              {preferences.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-bold"
                >
                  {p}
                  <button className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center hover:bg-purple-300 transition-colors">
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
              Kept to three at most, counted from the child&apos;s answers during Focus sessions.
              You can remove any of them if they are no longer relevant.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
