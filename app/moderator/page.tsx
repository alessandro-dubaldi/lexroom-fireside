'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Question, QuestionStatus } from '@/lib/types';

const TABS = ['all', 'pending', 'highlighted', 'dismissed'] as const;
type Tab = typeof TABS[number];

export default function ModeratorPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mod_password');
    if (saved) {
      setStoredPassword(saved);
      setAuthed(true);
    }
  }, []);

  const fetchQuestions = useCallback(async (pwd: string) => {
    try {
      const res = await fetch(`/api/questions?mod=1&key=${encodeURIComponent(pwd)}`);
      if (res.status === 401) {
        setAuthed(false);
        localStorage.removeItem('mod_password');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authed || !storedPassword) return;
    fetchQuestions(storedPassword);
    const interval = setInterval(() => fetchQuestions(storedPassword), 2000);
    return () => clearInterval(interval);
  }, [authed, storedPassword, fetchQuestions]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?mod=1&key=${encodeURIComponent(password)}`);
      if (res.status === 401) {
        setError('Incorrect password');
        return;
      }
      const data = await res.json();
      setQuestions(data);
      setStoredPassword(password);
      setAuthed(true);
      localStorage.setItem('mod_password', password);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: QuestionStatus) {
    if (actionId) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, key: storedPassword }),
      });
      if (res.status === 401) {
        setAuthed(false);
        localStorage.removeItem('mod_password');
        return;
      }
      await fetchQuestions(storedPassword);
    } finally {
      setActionId(null);
    }
  }

  function handleSignOut() {
    localStorage.removeItem('mod_password');
    setAuthed(false);
    setStoredPassword('');
    setPassword('');
    setQuestions([]);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎙</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Moderator Access</h1>
            <p className="text-gray-400 text-sm mt-1">Lexroom Fireside Q&A</p>
          </div>
          <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500 mb-4 transition-colors"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              type="submit"
              disabled={!password || loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const counts = {
    all: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    highlighted: questions.filter(q => q.status === 'highlighted').length,
    dismissed: questions.filter(q => q.status === 'dismissed').length,
  };

  const filtered = questions
    .filter(q => tab === 'all' || q.status === tab)
    .sort((a, b) => {
      if (a.status === 'highlighted' && b.status !== 'highlighted') return -1;
      if (b.status === 'highlighted' && a.status !== 'highlighted') return 1;
      return b.votes - a.votes;
    });

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Moderator Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Lexroom Fireside Q&A</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Audience view ↗
          </a>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{counts.pending}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
        </div>
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts.highlighted}</p>
          <p className="text-xs text-gray-500 mt-0.5">Highlighted</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{counts.dismissed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Dismissed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t} <span className="opacity-60">({counts[t]})</span>
          </button>
        ))}
      </div>

      {/* Question list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          No questions in this category
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <ModCard
              key={q.id}
              question={q}
              onHighlight={() => updateStatus(q.id, 'highlighted')}
              onDismiss={() => updateStatus(q.id, 'dismissed')}
              onRestore={() => updateStatus(q.id, 'pending')}
              loading={actionId === q.id}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function ModCard({
  question,
  onHighlight,
  onDismiss,
  onRestore,
  loading,
}: {
  question: Question;
  onHighlight: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  loading: boolean;
}) {
  const isHighlighted = question.status === 'highlighted';
  const isDismissed = question.status === 'dismissed';

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${
        isHighlighted
          ? 'bg-amber-950/30 border-amber-500/30'
          : isDismissed
          ? 'bg-gray-900/40 border-gray-800 opacity-50'
          : 'bg-gray-900 border-gray-800'
      }`}
    >
      <div className="flex gap-4 items-start">
        {/* Vote count */}
        <div className="flex flex-col items-center min-w-[44px] text-center bg-gray-800 rounded-xl px-2 py-2 border border-gray-700">
          <span className="text-indigo-400 font-bold text-lg leading-none">{question.votes}</span>
          <span className="text-gray-500 text-xs">votes</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm leading-relaxed">{question.text}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
            <span className="font-medium text-gray-400">{question.authorName}</span>
            <span>·</span>
            <span>
              {new Date(question.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isHighlighted && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-semibold">● Live</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-center shrink-0">
          {isDismissed ? (
            <button
              onClick={onRestore}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-40"
            >
              Restore
            </button>
          ) : isHighlighted ? (
            <>
              <button
                onClick={onRestore}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-40"
              >
                Remove
              </button>
              <button
                onClick={onDismiss}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-900/30 transition-colors disabled:opacity-40"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onHighlight}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg border border-amber-600/30 transition-colors disabled:opacity-40"
              >
                Highlight
              </button>
              <button
                onClick={onDismiss}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-900/30 transition-colors disabled:opacity-40"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
