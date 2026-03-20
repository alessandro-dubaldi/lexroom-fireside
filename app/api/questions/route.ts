import { NextResponse } from 'next/server';
import { getQuestions, setQuestions } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isMod = searchParams.get('mod') === '1';
  const key = searchParams.get('key') ?? '';

  if (isMod) {
    const modPassword = process.env.MODERATOR_PASSWORD ?? 'lexroom';
    if (key !== modPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const questions = await getQuestions();
    return NextResponse.json(questions);
  }

  const questions = await getQuestions();
  return NextResponse.json(questions.filter(q => q.status !== 'dismissed'));
}

export async function POST(request: Request) {
  const body = await request.json();
  const text = (body.text ?? '').trim();
  const authorName = ((body.authorName ?? '').trim() || 'Anonymous').slice(0, 50);

  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 });
  }

  const questions = await getQuestions();
  const newQuestion = {
    id: uuidv4(),
    text: text.slice(0, 500),
    authorName,
    votes: 0,
    voterIds: [] as string[],
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  await setQuestions([...questions, newQuestion]);
  return NextResponse.json(newQuestion, { status: 201 });
}
