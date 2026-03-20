import { kv } from '@vercel/kv';
import type { Question } from './types';

const KEY = 'fireside:questions';

export async function getQuestions(): Promise<Question[]> {
  const data = await kv.get<Question[]>(KEY);
  return data ?? [];
}

export async function setQuestions(questions: Question[]): Promise<void> {
  await kv.set(KEY, questions);
}
