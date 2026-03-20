import { NextResponse } from 'next/server';
import { getQuestions, setQuestions } from '@/lib/kv';
import type { QuestionStatus } from '@/lib/types';

const VALID_STATUSES: QuestionStatus[] = ['pending', 'highlighted', 'dismissed'];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { status, key } = await request.json();

  const modPassword = process.env.MODERATOR_PASSWORD ?? 'lexroom';
  if (key !== modPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const questions = await getQuestions();
  const idx = questions.findIndex(q => q.id === params.id);

  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  questions[idx] = { ...questions[idx], status };
  await setQuestions(questions);

  return NextResponse.json(questions[idx]);
}
