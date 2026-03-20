import { NextResponse } from 'next/server';
import { getPolls, setPolls } from '@/lib/polls';
import type { PollStatus } from '@/lib/types';

const VALID: PollStatus[] = ['draft', 'active', 'closed'];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { status, key } = await request.json();

  const modPassword = process.env.MODERATOR_PASSWORD ?? 'lexroom';
  if (key !== modPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const polls = await getPolls();
  const idx = polls.findIndex(p => p.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only one poll active at a time
  if (status === 'active') {
    polls.forEach((p, i) => { if (p.status === 'active') polls[i] = { ...p, status: 'closed' }; });
  }

  polls[idx] = { ...polls[idx], status };
  await setPolls(polls);
  return NextResponse.json(polls[idx]);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') ?? '';

  const modPassword = process.env.MODERATOR_PASSWORD ?? 'lexroom';
  if (key !== modPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const polls = await getPolls();
  await setPolls(polls.filter(p => p.id !== params.id));
  return NextResponse.json({ ok: true });
}
