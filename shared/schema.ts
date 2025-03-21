import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  text: text("text").notNull().unique(),
  category: text("category").notNull(),
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  win: integer("win").notNull(),
  questionCount: integer("question_count").notNull(),
  createdAt: text("created_at").notNull(),
});

export const gameQuestions = pgTable("game_questions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  questionNumber: integer("question_number").notNull(),
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
