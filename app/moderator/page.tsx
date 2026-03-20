'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Question, QuestionStatus, Poll, PollStatus } from '@/lib/types';

const Q_TABS = ['all', 'pending', 'highlighted', 'dismissed'] as const;
type QTab = typeof Q_TABS[number];
const MOD_SECTIONS = ['questions', 'polls'] as const;
type Section = typeof MOD_SECTIONS[number];

function LexroomLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size * 4.2} height={size} viewBox="0 0 126 30" fill="none" aria-label="Lexroom">
      <text x="0" y="23" fontFamily="'Instrument Serif', Georgia, serif" fontSize="26" fontWeight="400" fill="#0F4C9D" letterSpacing="-0.5">
        Lexroom
      </text>
    </svg>
  );
}

export default function ModeratorPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [section, setSection] = useState<Section>('questions');
  const [qTab, setQTab] = useState<QTab>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  // Poll creation
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mod_password');
    if (saved) { setStoredPassword(saved); setAuthed(true); }
  }, []);

  const fetchAll = useCallback(async (pwd: string) => {
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`/api/questions?mod=1&key=${encodeURIComponent(pwd)}`),
        fetch(`/api/polls?mod=1&key=${encodeURIComponent(pwd)}`),
      ]);
      if (qRes.status === 401) { setAuthed(false); localStorage.removeItem('mod_password'); return; }
      if (qRes.ok) setQuestions(await qRes.json());
      if (pRes.ok) setPolls(await pRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!authed || !storedPassword) return;
    fetchAll(storedPassword);
    const i = setInterval(() => fetchAll(storedPassword), 2000);
    return () => clearInterval(i);
  }, [authed, storedPassword, fetchAll]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`/api/questions?mod=1&key=${encodeURIComponent(password)}`);
      if (res.status === 401) { setError('Incorrect password'); return; }
      setQuestions(await res.json());
      setStoredPassword(password);
      setAuthed(true);
      localStorage.setItem('mod_password', password);
    } finally { setLoading(false); }
  }

  async function updateQStatus(id: string, status: QuestionStatus) {
    if (actionId) return;
    setActionId(id);
    try {
      await fetch(`/api/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, key: storedPassword }),
      });
      await fetchAll(storedPassword);
    } finally { setActionId(null); }
  }

  async function updatePollStatus(id: string, status: PollStatus) {
    if (actionId) return;
    setActionId(id);
    try {
      await fetch(`/api/polls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, key: storedPassword }),
      });
      await fetchAll(storedPassword);
    } finally { setActionId(null); }
  }

  async function deletePoll(id: string) {
    if (actionId) return;
    setActionId(id);
    try {
      await fetch(`/api/polls/${id}?key=${encodeURIComponent(storedPassword)}`, { method: 'DELETE' });
      await fetchAll(storedPassword);
    } finally { setActionId(null); }
  }

  async function createPoll(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    setCreating(true);
    try {
      await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pollQuestion, options: validOptions, key: storedPassword }),
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      await fetchAll(storedPassword);
    } finally { setCreating(false); }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <LexroomLogo size={32} />
          </div>
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl text-lx-gray">Moderator Access</h1>
            <p className="text-lx-gray/40 text-sm mt-1">Fireside Q&A</p>
          </div>
          <form onSubmit={handleLogin} className="bg-lx-surface rounded-2xl p-6 border border-lx-border">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full bg-lx-dark text-lx-gray rounded-xl px-4 py-3 text-sm border border-lx-border focus:outline-none focus:border-lx-blue/60 placeholder-lx-gray/30 mb-4 transition-colors"
            />
            {error && <p className="text-lx-red text-xs mb-3">{error}</p>}
            <button
              type="submit"
              disabled={!password || loading}
              className="w-full py-2.5 bg-lx-blue hover:bg-lx-blue/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const qCounts = {
    all: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    highlighted: questions.filter(q => q.status === 'highlighted').length,
    dismissed: questions.filter(q => q.status === 'dismissed').length,
  };

  const filteredQ = questions
    .filter(q => qTab === 'all' || q.status === qTab)
    .sort((a, b) => {
      if (a.status === 'highlighted' && b.status !== 'highlighted') return -1;
      if (b.status === 'highlighted' && a.status !== 'highlighted') return 1;
      return b.votes - a.votes;
    });

  const activePoll = polls.find(p => p.status === 'active');

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <LexroomLogo size={26} />
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs text-lx-gray/40 hover:text-lx-gray transition-colors">
            Audience view ↗
          </a>
          <button
            onClick={() => { localStorage.removeItem('mod_password'); setAuthed(false); setStoredPassword(''); }}
            className="text-xs text-lx-gray/40 hover:text-lx-gray transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mb-8">
        <h1 className="font-serif text-2xl text-lx-gray">Moderator Dashboard</h1>
      </div>

      {/* Section toggle */}
      <div className="flex gap-1 bg-lx-surface rounded-xl p-1 border border-lx-border mb-6 w-fit">
        {MOD_SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-colors capitalize ${
              section === s ? 'bg-lx-blue text-white' : 'text-lx-gray/50 hover:text-lx-gray'
            }`}
          >
            {s}
            {s === 'questions' && ` (${qCounts.pending})`}
            {s === 'polls' && activePoll ? ' ●' : ''}
          </button>
        ))}
      </div>

      {/* ── QUESTIONS section ── */}
      {section === 'questions' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard value={qCounts.pending} label="Pending" />
            <StatCard value={qCounts.highlighted} label="Highlighted" accent="blue" />
            <StatCard value={qCounts.dismissed} label="Dismissed" muted />
          </div>

          {/* Q tabs */}
          <div className="flex gap-1 bg-lx-surface rounded-xl p-1 border border-lx-border mb-5">
            {Q_TABS.map(t => (
              <button
                key={t}
                onClick={() => setQTab(t)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${
                  qTab === t ? 'bg-lx-blue text-white' : 'text-lx-gray/50 hover:text-lx-gray'
                }`}
              >
                {t} <span className="opacity-50">({qCounts[t]})</span>
              </button>
            ))}
          </div>

          {filteredQ.length === 0 ? (
            <div className="text-center py-16 text-lx-gray/20 text-sm">No questions here</div>
          ) : (
            <div className="space-y-3">
              {filteredQ.map(q => (
                <QModCard
                  key={q.id}
                  question={q}
                  loading={actionId === q.id}
                  onHighlight={() => updateQStatus(q.id, 'highlighted')}
                  onDismiss={() => updateQStatus(q.id, 'dismissed')}
                  onRestore={() => updateQStatus(q.id, 'pending')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── POLLS section ── */}
      {section === 'polls' && (
        <>
          {/* Create form */}
          <form onSubmit={createPoll} className="bg-lx-surface border border-lx-border rounded-2xl p-5 mb-6">
            <h2 className="font-serif text-base text-lx-gray mb-4">Create a poll</h2>
            <input
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="Poll question…"
              maxLength={300}
              className="w-full bg-lx-dark text-lx-gray rounded-xl px-4 py-2.5 text-sm border border-lx-border focus:outline-none focus:border-lx-blue/60 placeholder-lx-gray/30 mb-3 transition-colors"
            />
            <div className="space-y-2 mb-4">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={e => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    maxLength={100}
                    className="flex-1 bg-lx-dark text-lx-gray rounded-xl px-4 py-2 text-sm border border-lx-border focus:outline-none focus:border-lx-blue/60 placeholder-lx-gray/30 transition-colors"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      className="text-lx-gray/30 hover:text-lx-red transition-colors px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-lx-blue hover:text-lx-blue/70 transition-colors"
                >
                  + Add option
                </button>
              )}
              <button
                type="submit"
                disabled={creating || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                className="ml-auto px-5 py-2 bg-lx-blue hover:bg-lx-blue/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {creating ? 'Creating…' : 'Create poll'}
              </button>
            </div>
          </form>

          {/* Poll list */}
          {polls.length === 0 ? (
            <div className="text-center py-16 text-lx-gray/20 text-sm">No polls yet</div>
          ) : (
            <div className="space-y-3">
              {polls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(poll => (
                <PollModCard
                  key={poll.id}
                  poll={poll}
                  loading={actionId === poll.id}
                  onActivate={() => updatePollStatus(poll.id, 'active')}
                  onClose={() => updatePollStatus(poll.id, 'closed')}
                  onDraft={() => updatePollStatus(poll.id, 'draft')}
                  onDelete={() => deletePoll(poll.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatCard({ value, label, accent, muted }: { value: number; label: string; accent?: string; muted?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 text-center border ${
      accent === 'blue' ? 'bg-lx-blue-dim border-lx-blue-border' :
      muted ? 'bg-lx-surface border-lx-border opacity-60' :
      'bg-lx-surface border-lx-border'
    }`}>
      <p className={`text-2xl font-bold ${accent === 'blue' ? 'text-lx-blue' : 'text-lx-gray'}`}>{value}</p>
      <p className="text-xs text-lx-gray/40 mt-0.5">{label}</p>
    </div>
  );
}

function QModCard({ question, onHighlight, onDismiss, onRestore, loading }: {
  question: Question;
  onHighlight: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  loading: boolean;
}) {
  const isHighlighted = question.status === 'highlighted';
  const isDismissed = question.status === 'dismissed';

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isHighlighted ? 'bg-lx-blue-dim border-lx-blue-border' :
      isDismissed ? 'bg-lx-surface border-lx-border opacity-50' :
      'bg-lx-surface border-lx-border'
    }`}>
      <div className="flex gap-4 items-start">
        <div className="flex flex-col items-center min-w-[44px] text-center bg-lx-dark rounded-xl px-2 py-2 border border-lx-border">
          <span className="text-lx-blue font-bold text-lg leading-none">{question.votes}</span>
          <span className="text-lx-gray/30 text-xs">votes</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lx-gray text-sm leading-relaxed">{question.text}</p>
          <div className="flex items-center gap-2 text-xs text-lx-gray/40 mt-1.5">
            <span className="font-medium text-lx-gray/60">{question.authorName}</span>
            <span>·</span>
            <span>{new Date(question.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isHighlighted && <><span>·</span><span className="text-lx-blue font-semibold">● Live</span></>}
          </div>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          {isDismissed ? (
            <ModBtn onClick={onRestore} disabled={loading}>Restore</ModBtn>
          ) : isHighlighted ? (
            <>
              <ModBtn onClick={onRestore} disabled={loading}>Remove</ModBtn>
              <ModBtn onClick={onDismiss} disabled={loading} variant="danger">Dismiss</ModBtn>
            </>
          ) : (
            <>
              <ModBtn onClick={onHighlight} disabled={loading} variant="primary">Highlight</ModBtn>
              <ModBtn onClick={onDismiss} disabled={loading} variant="danger">Dismiss</ModBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PollModCard({ poll, onActivate, onClose, onDraft, onDelete, loading }: {
  poll: Poll;
  onActivate: () => void;
  onClose: () => void;
  onDraft: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + o.voterIds.length, 0);

  return (
    <div className={`rounded-2xl p-4 border ${
      poll.status === 'active' ? 'bg-lx-blue-dim border-lx-blue-border' :
      poll.status === 'closed' ? 'bg-lx-surface border-lx-border opacity-70' :
      'bg-lx-surface border-lx-border'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              poll.status === 'active' ? 'text-lx-blue' :
              poll.status === 'closed' ? 'text-lx-gray/40' :
              'text-lx-gray/40'
            }`}>{poll.status}</span>
            <span className="text-lx-gray/20 text-xs">· {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          </div>
          <p className="font-serif text-lx-gray text-sm">{poll.question}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {poll.status === 'draft' && <ModBtn onClick={onActivate} disabled={loading} variant="primary">Activate</ModBtn>}
          {poll.status === 'active' && <ModBtn onClick={onClose} disabled={loading}>Close</ModBtn>}
          {poll.status === 'closed' && <ModBtn onClick={onDraft} disabled={loading}>Reopen</ModBtn>}
          <ModBtn onClick={onDelete} disabled={loading} variant="danger">Delete</ModBtn>
        </div>
      </div>
      <div className="space-y-1.5">
        {poll.options.map(opt => {
          const pct = totalVotes > 0 ? Math.round((opt.voterIds.length / totalVotes) * 100) : 0;
          return (
            <div key={opt.id} className="flex items-center gap-3">
              <span className="text-xs text-lx-gray/50 w-32 truncate">{opt.text}</span>
              <div className="flex-1 bg-lx-border rounded-full h-1.5">
                <div className="bg-lx-blue h-1.5 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-lx-gray/30 tabular-nums w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModBtn({ children, onClick, disabled, variant }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'default';
}) {
  const cls = variant === 'primary'
    ? 'bg-lx-blue/20 text-lx-blue border-lx-blue/30 hover:bg-lx-blue/30'
    : variant === 'danger'
    ? 'bg-lx-red-dim text-lx-red border-lx-red-border hover:bg-lx-red/20'
    : 'bg-lx-dark text-lx-gray/60 border-lx-border hover:text-lx-gray hover:bg-lx-surface';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
