export interface Question {
  id: number;
  text: string;
  answer: string;
  isLLMQuestion?: boolean;
}

export type GameMode = "v1" | "v2"; // v1 = Human asks, LLM answers; v2 = LLM asks, LLM answers
export type Difficulty = "easy" | "medium" | "hard";
export type WordCategory = "animal" | "place" | "object" | "food" | "person" | "concept";

export interface Word {
  id: number;
  text: string;
  category: WordCategory;
  difficulty: Difficulty;
  hints?: string[];
}

export interface GameSettings {
  gameMode: GameMode;
  difficulty: Difficulty;
  categories: WordCategory[];
  showHints: boolean;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  averageQuestions: number;
  bestScore: number; // Least questions used to win
  completionTimes: number[]; // Time taken to complete games in seconds
}

export interface GameState {
  // Core game state
  questionCount: number;
  isGameActive: boolean;
  questions: Question[];
  isHistoryCollapsed: boolean;
  selectedWord?: string;
  selectedCategory?: WordCategory;
  gameResult?: "win" | "lose" | null;
  
  // New features
  gameMode: GameMode;
  difficulty: Difficulty;
  statusMessage?: string;
  hints?: string[];
  hintsUsed: number;
  gameStartTime?: number; // timestamp when game started
  isPaused: boolean;
  showControlPanel: boolean;
  
  // For V2 mode
  waitingForLLMQuestion: boolean;
  waitingForLLMAnswer: boolean;
  currentLLMQuestion?: string;
  
  // Statistics
  stats: GameStats;
}
