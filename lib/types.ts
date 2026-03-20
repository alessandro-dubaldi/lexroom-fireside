export type QuestionStatus = 'pending' | 'highlighted' | 'dismissed';

export interface Question {
  id: string;
  text: string;
  authorName: string;
  votes: number;
  voterIds: string[];
  status: QuestionStatus;
  createdAt: string;
}
