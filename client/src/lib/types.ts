export interface Question {
  id: number;
  text: string;
  answer: string;
}

export interface GameState {
  questionCount: number;
  isGameActive: boolean;
  questions: Question[];
  isHistoryCollapsed: boolean;
  selectedWord?: string;
  gameResult?: "win" | "lose" | null;
}

export type WordCategory = "animal" | "place" | "object" | "food";

export interface Word {
  id: number;
  text: string;
  category: WordCategory;
}
