import { NextResponse } from 'next/server';
import { getPolls, setPolls } from '@/lib/polls';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { optionId, voterId } = await request.json();

  if (!optionId || !voterId) {
    return NextResponse.json({ error: 'optionId and voterId required' }, { status: 400 });
  }

  const polls = await getPolls();
  const pollIdx = polls.findIndex(p => p.id === params.id);
  if (pollIdx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const poll = polls[pollIdx];
  if (poll.status !== 'active') {
    return NextResponse.json({ error: 'Poll is not active' }, { status: 400 });
  }

  // Check if already voted on any option
  const alreadyVoted = poll.options.some(o => o.voterIds.includes(voterId));
  if (alreadyVoted) {
    return NextResponse.json({ error: 'Already voted' }, { status: 400 });
  }

  const optIdx = poll.options.findIndex(o => o.id === optionId);
  if (optIdx === -1) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

  polls[pollIdx] = {
    ...poll,
    options: poll.options.map((o, i) =>
      i === optIdx ? { ...o, voterIds: [...o.voterIds, voterId] } : o
    ),
  };

  await setPolls(polls);
  return NextResponse.json(polls[pollIdx]);
}
