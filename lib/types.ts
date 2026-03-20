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

export type PollStatus = 'draft' | 'active' | 'closed';

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
}
