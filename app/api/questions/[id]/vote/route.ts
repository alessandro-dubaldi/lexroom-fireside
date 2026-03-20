import { NextResponse } from 'next/server';
import { getQuestions, setQuestions } from '@/lib/kv';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { voterId } = await request.json();

  if (!voterId) {
    return NextResponse.json({ error: 'voterId required' }, { status: 400 });
  }

  const questions = await getQuestions();
  const idx = questions.findIndex(q => q.id === params.id);

  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const q = questions[idx];

  if (q.voterIds.includes(voterId)) {
    // Toggle off
    questions[idx] = {
      ...q,
      votes: Math.max(0, q.votes - 1),
      voterIds: q.voterIds.filter(id => id !== voterId),
    };
  } else {
    // Toggle on
    questions[idx] = {
      ...q,
      votes: q.votes + 1,
      voterIds: [...q.voterIds, voterId],
    };
  }

  await setQuestions(questions);
  return NextResponse.json(questions[idx]);
}
