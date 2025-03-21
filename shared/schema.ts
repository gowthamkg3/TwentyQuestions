import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  gamesPlayed: integer("games_played").default(0),
  gamesWon: integer("games_won").default(0),
  avgQuestionCount: integer("avg_question_count").default(0),
  bestScore: integer("best_score").default(20),
});

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  text: text("text").notNull().unique(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  hints: text("hints").array(), // Array of hints for challenging words
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Optional, if user is logged in
  word: text("word").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  gameMode: text("game_mode").notNull(), // V1 or V2 mode
  win: boolean("win").notNull(),
  questionCount: integer("question_count").notNull(),
  hintsUsed: integer("hints_used").default(0),
  createdAt: text("created_at").notNull(),
  completionTime: integer("completion_time"), // Time taken to complete in seconds
});

export const gameQuestions = pgTable("game_questions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  questionNumber: integer("question_number").notNull(),
  isLLMQuestion: boolean("is_llm_question").default(false), // For V2 mode
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWordSchema = createInsertSchema(words);
export const insertGameHistorySchema = createInsertSchema(gameHistory);
export const insertGameQuestionSchema = createInsertSchema(gameQuestions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;

export type InsertGameQuestion = z.infer<typeof insertGameQuestionSchema>;
export type GameQuestion = typeof gameQuestions.$inferSelect;
