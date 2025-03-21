import { 
  users, type User, type InsertUser,
  Word, InsertWord,
  GameHistory, InsertGameHistory,
  GameQuestion, InsertGameQuestion
} from "@shared/schema";

// Game session interface
export interface GameSession {
  id: string;
  word: string;
  category: string;
  difficulty: string;
  gameMode: string; // "v1" or "v2"
  questionCount: number;
  questions: Array<{
    question: string;
    answer: string;
    isLLMQuestion?: boolean;
  }>;
  active: boolean;
  hints?: string[];
  hintsUsed: number;
  startTime: number;
  pauseTime?: number;
}

// Storage interface
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game related methods
  createGameSession(
    word: string, 
    category?: string, 
    difficulty?: string, 
    gameMode?: string,
    hints?: string[]
  ): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(session: GameSession): Promise<void>;
  endGameSession(id: string, win: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameSessions: Map<string, GameSession>;
  currentId: number;
  
  constructor() {
    this.users = new Map();
    this.gameSessions = new Map();
    this.currentId = 1;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      gamesPlayed: 0,
      gamesWon: 0,
      avgQuestionCount: 0,
      bestScore: 20
    };
    this.users.set(id, user);
    return user;
  }
  
  async createGameSession(
    word: string, 
    category: string = "object", 
    difficulty: string = "medium", 
    gameMode: string = "v1",
    hints: string[] = []
  ): Promise<GameSession> {
    const id = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const session: GameSession = {
      id,
      word,
      category,
      difficulty,
      gameMode,
      questionCount: 0,
      questions: [],
      active: true,
      hints: hints,
      hintsUsed: 0,
      startTime: Date.now()
    };
    
    this.gameSessions.set(id, session);
    return session;
  }
  
  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }
  
  async updateGameSession(session: GameSession): Promise<void> {
    this.gameSessions.set(session.id, session);
  }
  
  async endGameSession(id: string, win: boolean): Promise<void> {
    const session = this.gameSessions.get(id);
    if (session) {
      session.active = false;
      this.gameSessions.set(id, session);
    }
  }
}

export const storage = new MemStorage();
