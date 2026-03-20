import { NextResponse } from 'next/server';
import { getPolls, setPolls } from '@/lib/polls';
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
    return NextResponse.json(await getPolls());
  }

  const polls = await getPolls();
  // Audience sees active and closed polls only
  return NextResponse.json(polls.filter(p => p.status !== 'draft'));
}

export async function POST(request: Request) {
  const { question, options, key } = await request.json();

  const modPassword = process.env.MODERATOR_PASSWORD ?? 'lexroom';
  if (key !== modPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'Question and at least 2 options required' }, { status: 400 });
  }

  const polls = await getPolls();
  const newPoll = {
    id: uuidv4(),
    question: question.trim().slice(0, 300),
    options: options.slice(0, 4).map((text: string) => ({
      id: uuidv4(),
      text: text.trim().slice(0, 100),
      voterIds: [],
    })),
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
  };

  await setPolls([...polls, newPoll]);
  return NextResponse.json(newPoll, { status: 201 });
}
