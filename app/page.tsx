'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Question } from '@/lib/types';

function getVoterId(): string {
  let id = localStorage.getItem('fireside_voter_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('fireside_voter_id', id);
  }
  return id;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voterId, setVoterId] = useState('');
  const [votingId, setVotingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setVoterId(getVoterId());
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        setLastUpdated(new Date());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 2000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          authorName: authorName.trim() || 'Anonymous',
        }),
      });
      setText('');
      await fetchQuestions();
    } finally {
      setSubmitting(false);
    }
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
      await fetchQuestions();
    } finally {
      setVotingId(null);
    }
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

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Lexroom Fireside</h1>
        <p className="text-gray-400 text-sm">Submit questions and upvote the ones you want answered</p>
      </div>

      {/* Submit Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 bg-gray-900 rounded-2xl p-5 border border-gray-800 shadow-xl"
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's your question?"
          rows={3}
          maxLength={500}
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm resize-none border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500 mb-3 transition-colors"
        />
        <div className="flex gap-3 items-center">
          <input
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={50}
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-600">{500 - text.length} chars remaining</span>
        </div>
      </form>

      {/* Highlighted questions */}
      {highlighted.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Now discussing
          </h2>
          {highlighted.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              voterId={voterId}
              onVote={handleVote}
              voting={votingId === q.id}
            />
          ))}
        </section>
      )}

      {/* Pending questions */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {highlighted.length > 0 ? 'Other questions' : 'Questions'} &middot; {pending.length}
          </h2>
          {pending.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              voterId={voterId}
              onVote={handleVote}
              voting={votingId === q.id}
            />
          ))}
        </section>
      )}

      {visible.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-sm">No questions yet — be the first to ask.</p>
        </div>
      )}

      {lastUpdated && (
        <p className="text-center text-xs text-gray-700 mt-8">
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </main>
  );
}

function QuestionCard({
  question,
  voterId,
  onVote,
  voting,
}: {
  question: Question;
  voterId: string;
  onVote: (id: string) => void;
  voting: boolean;
}) {
  const hasVoted = voterId ? question.voterIds.includes(voterId) : false;
  const isHighlighted = question.status === 'highlighted';

  return (
    <div
      className={`mb-3 rounded-2xl p-4 border flex gap-4 items-start transition-all ${
        isHighlighted
          ? 'bg-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-900/10'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Vote button */}
      <button
        onClick={() => onVote(question.id)}
        disabled={voting}
        title={hasVoted ? 'Remove vote' : 'Upvote'}
        className={`flex flex-col items-center min-w-[44px] rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
          hasVoted
            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-indigo-500/60 hover:text-indigo-400 hover:bg-indigo-600/10'
        }`}
      >
        <span className="text-sm leading-none mb-0.5">▲</span>
        <span className="text-sm font-bold">{question.votes}</span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm leading-relaxed">{question.text}</p>
        <p className="text-gray-500 text-xs mt-1.5">{question.authorName}</p>
      </div>

      {isHighlighted && (
        <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 shrink-0">
          Live
        </span>
      )}
    </div>
  );
}
