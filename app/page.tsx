'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Question, Poll } from '@/lib/types';

function getVoterId(): string {
  let id = localStorage.getItem('fireside_voter_id');
  if (!id) { id = uuidv4(); localStorage.setItem('fireside_voter_id', id); }
  return id;
}

const REACTIONS = ['👏', '🔥', '❤️', '💡', '🎯'];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

// ─── Logo ───────────────────────────────────────────────────────────────────
function LexroomLogo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo-mark.svg" width={size} height={size * 0.75} alt="" className="rounded-sm" />
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: size * 0.75, color: '#E4E4E4', letterSpacing: '-0.3px' }}>
        Lexroom
      </span>
    </div>
  );
}

// ─── Poll card (audience) ───────────────────────────────────────────────────
function PollCard({ poll, voterId, onVote }: {
  poll: Poll;
  voterId: string;
  onVote: (pollId: string, optionId: string) => void;
}) {
  const hasVoted = poll.options.some(o => o.voterIds.includes(voterId));
  const isClosed = poll.status === 'closed';
  const totalVotes = poll.options.reduce((s, o) => s + o.voterIds.length, 0);
  const showResults = hasVoted || isClosed;

  return (
    <div className="mb-6 rounded-2xl border border-lx-blue-border bg-lx-blue-dim p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-lx-gray/40' : 'bg-lx-blue animate-pulse'}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${isClosed ? 'text-lx-gray/40' : 'text-lx-blue'}`}>
          {isClosed ? 'Poll closed' : 'Live poll'}
        </span>
      </div>
      <p className="font-serif text-lg text-lx-gray mb-4 leading-snug">{poll.question}</p>

      {showResults ? (
        <div className="space-y-2.5">
          {poll.options.map(opt => {
            const pct = totalVotes > 0 ? Math.round((opt.voterIds.length / totalVotes) * 100) : 0;
            const myVote = opt.voterIds.includes(voterId);
            return (
              <div key={opt.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={myVote ? 'text-lx-blue font-semibold' : 'text-lx-gray/80'}>{opt.text}</span>
                  <span className="text-lx-gray/50 tabular-nums">{pct}% · {opt.voterIds.length}</span>
                </div>
                <div className="w-full bg-lx-border rounded-full h-2">
                  <div
                    className="bar-animated h-2 rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: myVote ? '#0F4C9D' : '#2E3340',
                      ...(myVote ? { boxShadow: '0 0 8px rgba(15,76,157,0.5)' } : {}),
                    }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-lx-gray/40 mt-1">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {poll.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onVote(poll.id, opt.id)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm border border-lx-border bg-lx-surface hover:border-lx-blue/60 hover:bg-lx-blue-dim transition-all text-lx-gray"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question card ───────────────────────────────────────────────────────────
function QuestionCard({ question, voterId, onVote, voting }: {
  question: Question;
  voterId: string;
  onVote: (id: string) => void;
  voting: boolean;
}) {
  const hasVoted = voterId ? question.voterIds.includes(voterId) : false;
  const isHighlighted = question.status === 'highlighted';

  return (
    <div className={`mb-3 rounded-2xl p-4 border flex gap-4 items-start transition-all ${
      isHighlighted
        ? 'bg-lx-blue-dim border-lx-blue-border shadow-lg shadow-lx-blue/5'
        : 'bg-lx-surface border-lx-border hover:border-lx-gray/20'
    }`}>
      <button
        onClick={() => onVote(question.id)}
        disabled={voting}
        className={`flex flex-col items-center min-w-[44px] rounded-xl px-2 py-2 text-xs font-bold transition-all border ${
          hasVoted
            ? 'bg-lx-blue/20 text-lx-blue border-lx-blue/40'
            : 'bg-lx-dark text-lx-gray/50 border-lx-border hover:border-lx-blue/50 hover:text-lx-blue hover:bg-lx-blue-dim'
        }`}
      >
        <span className="text-sm leading-none mb-0.5">▲</span>
        <span className="text-sm">{question.votes}</span>
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-lx-gray text-sm leading-relaxed">{question.text}</p>
        <p className="text-lx-gray/40 text-xs mt-1.5">{question.authorName}</p>
      </div>

      {isHighlighted && (
        <span className="text-xs font-semibold text-lx-blue bg-lx-blue/10 px-2.5 py-1 rounded-full border border-lx-blue/30 shrink-0">
          Live
        </span>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voterId, setVoterId] = useState('');
  const [votingId, setVotingId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const reactionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setVoterId(getVoterId()); }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, pRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/polls'),
      ]);
      if (qRes.ok) setQuestions(await qRes.json());
      if (pRes.ok) setPolls(await pRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 2000);
    return () => clearInterval(i);
  }, [fetchAll]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), authorName: authorName.trim() || 'Anonymous' }),
      });
      setText('');
      await fetchAll();
    } finally { setSubmitting(false); }
  }

  async function handleVote(id: string) {
    if (votingId || !voterId) return;
    setVotingId(id);
    try {
      await fetch(`/api/questions/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId }),
      });
      await fetchAll();
    } finally { setVotingId(null); }
  }

  async function handlePollVote(pollId: string, optionId: string) {
    if (!voterId) return;
    await fetch(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, voterId }),
    });
    await fetchAll();
  }

  function fireReaction(emoji: string) {
    const id = uuidv4();
    const x = 20 + Math.random() * 60; // random horizontal spread %
    setReactions(r => [...r, { id, emoji, x }]);
    setTimeout(() => setReactions(r => r.filter(r => r.id !== id)), 1500);
  }

  const visible = questions
    .filter(q => q.status !== 'dismissed')
    .sort((a, b) => {
      if (a.status === 'highlighted' && b.status !== 'highlighted') return -1;
      if (b.status === 'highlighted' && a.status !== 'highlighted') return 1;
      return b.votes - a.votes;
    });
  const highlighted = visible.filter(q => q.status === 'highlighted');
  const pending = visible.filter(q => q.status === 'pending');
  const activePoll = polls.find(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <LexroomLogo />
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Live</span>
        </div>
      </header>

      <div className="mb-8">
        <h1 className="font-serif text-3xl text-lx-gray mb-1">Fireside Q&A</h1>
        <p className="text-lx-gray/50 text-sm">Submit questions and vote for the ones you want answered</p>
      </div>

      {/* Active poll */}
      {activePoll && (
        <PollCard poll={activePoll} voterId={voterId} onVote={handlePollVote} />
      )}

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-lx-surface rounded-2xl p-5 border border-lx-border">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's your question?"
          rows={3}
          maxLength={500}
          className="w-full bg-lx-dark text-lx-gray rounded-xl px-4 py-3 text-sm resize-none border border-lx-border focus:outline-none focus:border-lx-blue/60 placeholder-lx-gray/30 mb-3 transition-colors"
        />
        <div className="flex gap-3 items-center">
          <input
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={50}
            className="flex-1 bg-lx-dark text-lx-gray rounded-xl px-4 py-2.5 text-sm border border-lx-border focus:outline-none focus:border-lx-blue/60 placeholder-lx-gray/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="px-5 py-2.5 bg-lx-blue hover:bg-lx-blue/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </div>
        <p className="text-xs text-lx-gray/30 mt-2">{500 - text.length} chars remaining</p>
      </form>

      {/* Highlighted questions */}
      {highlighted.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-lx-blue uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-lx-blue animate-pulse" />
            Now discussing
          </h2>
          {highlighted.map(q => (
            <QuestionCard key={q.id} question={q} voterId={voterId} onVote={handleVote} voting={votingId === q.id} />
          ))}
        </section>
      )}

      {/* Pending questions */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-lx-gray/40 uppercase tracking-wider mb-3">
            {highlighted.length > 0 ? 'Other questions' : 'Questions'} · {pending.length}
          </h2>
          {pending.map(q => (
            <QuestionCard key={q.id} question={q} voterId={voterId} onVote={handleVote} voting={votingId === q.id} />
          ))}
        </section>
      )}

      {/* Closed polls archive */}
      {closedPolls.length > 0 && (
        <section className="mt-8 pt-8 border-t border-lx-border">
          <h2 className="text-xs font-semibold text-lx-gray/40 uppercase tracking-wider mb-4">Past polls</h2>
          {closedPolls.map(p => (
            <PollCard key={p.id} poll={p} voterId={voterId} onVote={() => {}} />
          ))}
        </section>
      )}

      {visible.length === 0 && !activePoll && (
        <div className="text-center py-20 text-lx-gray/20">
          <p className="font-serif text-4xl mb-3 italic">No questions yet</p>
          <p className="text-sm">Be the first to ask.</p>
        </div>
      )}

      {/* Reactions bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div ref={reactionsRef} className="relative flex items-center gap-2 bg-lx-surface border border-lx-border rounded-2xl px-4 py-2.5 shadow-xl">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => fireReaction(emoji)}
              className="text-xl hover:scale-125 active:scale-110 transition-transform select-none"
            >
              {emoji}
            </button>
          ))}
          {/* Floating reactions */}
          {reactions.map(r => (
            <span
              key={r.id}
              className="reaction-float"
              style={{ left: `${r.x}%`, bottom: '100%', transform: 'translateX(-50%)' }}
            >
              {r.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className="h-20" /> {/* spacer for reactions bar */}
    </main>
  );
}
