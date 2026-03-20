import { Redis } from '@upstash/redis';
import type { Question } from './types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = 'fireside:questions';

export async function getQuestions(): Promise<Question[]> {
  const data = await redis.get<Question[]>(KEY);
  return data ?? [];
}

export async function setQuestions(questions: Question[]): Promise<void> {
  await redis.set(KEY, questions);
}
