import { Redis } from '@upstash/redis';
import type { Poll } from './types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = 'fireside:polls';

export async function getPolls(): Promise<Poll[]> {
  const data = await redis.get<Poll[]>(KEY);
  return data ?? [];
}

export async function setPolls(polls: Poll[]): Promise<void> {
  await redis.set(KEY, polls);
}
