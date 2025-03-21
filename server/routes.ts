import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  selectRandomWord, 
  answerQuestion, 
  checkFinalGuess, 
  generateQuestion,
  simulateHumanAnswer,
  makeGuess
} from "./openai";
import {
  selectRandomWordGemini,
  answerQuestionGemini,
  checkFinalGuessGemini,
  generateQuestionGemini,
  simulateHumanAnswerGemini,
  makeGuessGemini
} from "./gemini";

// Types for LLM configuration
type LLMProvider = "openai" | "gemini";
interface LLMConfig {
  questioner: LLMProvider;
  answerer: LLMProvider;
}

// Keep the current active game session id
let currentGameSessionId: string | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Stop current game
  app.post("/api/game/stop", async (req, res) => {
    try {
      if (currentGameSessionId) {
        await storage.endGameSession(currentGameSessionId, false);
        currentGameSessionId = null;
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping game:", error);
      res.status(500).json({ error: "Failed to stop game" });
    }
  });
  // Start a new game
  app.post("/api/game/start", async (req, res) => {
    try {
      const { 
        gameMode = "v1", 
        difficulty = "medium", 
        category,
        llmConfig = { questioner: "openai", answerer: "openai" } 
      } = req.body;
      
      // Choose which API to use for word selection based on answerer config
      let wordData;
      if (llmConfig.answerer === "gemini") {
        wordData = await selectRandomWordGemini({
          category,
          difficulty
        });
      } else {
        wordData = await selectRandomWord({
          category,
          difficulty
        });
      }
      
      // Create a new game session with additional metadata
      const session = await storage.createGameSession(
        wordData.word,
        wordData.category,
        wordData.difficulty,
        gameMode,
        wordData.hints,
        llmConfig
      );
      currentGameSessionId = session.id;
      
      console.log(`New game started with word: ${wordData.word}, category: ${wordData.category}, difficulty: ${wordData.difficulty}`);
      
      // Return success (in production, we would NOT return the actual word to the client)
      if (process.env.NODE_ENV === "production") {
        res.json({ 
          success: true,
          gameMode,
          category: wordData.category,
          difficulty: wordData.difficulty
        });
      } else {
        res.json({ 
          success: true, 
          word: wordData.word,
          gameMode,
          category: wordData.category,
          difficulty: wordData.difficulty,
          hints: wordData.hints
        });
      }
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });
  
  // Ask a question
  app.post("/api/game/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      // Validate question
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check if maximum questions reached
      if (session.questionCount >= 20) {
        return res.status(400).json({ error: "Maximum questions reached" });
      }
      
      // Use OpenAI to answer the question
      const answer = await answerQuestion(
        session.word, 
        question, 
        session.questions
      );
      
      // Update the session
      session.questionCount += 1;
      session.questions.push({ question, answer });
      await storage.updateGameSession(session);
      
      // Return the answer
      res.json({ question, answer });
    } catch (error) {
      console.error("Error processing question:", error);
      res.status(500).json({ error: "Failed to process question" });
    }
  });
  
  // Get a hint
  app.post("/api/game/hint", async (req, res) => {
    try {
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check if we have hints available
      if (!session.hints || session.hints.length === 0) {
        return res.status(400).json({ error: "No hints available for this word" });
      }
      
      // Ensure hintsUsed isn't greater than available hints
      if (session.hintsUsed >= session.hints.length) {
        return res.status(400).json({ error: "No more hints available" });
      }
      
      // Get the next hint
      const hint = session.hints[session.hintsUsed];
      
      // Update the session
      session.hintsUsed += 1;
      await storage.updateGameSession(session);
      
      // Return the hint
      res.json({ hint, hintsUsed: session.hintsUsed, totalHints: session.hints.length });
    } catch (error) {
      console.error("Error getting hint:", error);
      res.status(500).json({ error: "Failed to get hint" });
    }
  });
  
  // V2 Mode: Get LLM to ask a question
  app.post("/api/game/llm-question", async (req, res) => {
    try {
      // Check for client-provided LLM config
      const { llmConfig } = req.body;
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check game mode
      if (session.gameMode !== "v2") {
        return res.status(400).json({ error: "This endpoint is only available in V2 mode" });
      }
      
      // Check if maximum questions reached
      if (session.questionCount >= 20) {
        return res.status(400).json({ error: "Maximum questions reached" });
      }
      
      // Use the client-provided config if valid, otherwise fall back to session config
      const activeConfig = (llmConfig && llmConfig.questioner) ? llmConfig : session.llmConfig;
      
      // Get LLM to generate a question using the appropriate API
      let question;
      if (activeConfig?.questioner === "gemini") {
        question = await generateQuestionGemini(session.word, session.questions);
      } else {
        question = await generateQuestion(session.word, session.questions);
      }
      
      // Return the question
      res.json({ question, questionCount: session.questionCount });
    } catch (error) {
      console.error("Error generating LLM question:", error);
      res.status(500).json({ error: "Failed to generate question" });
    }
  });
  
  // V2 Mode: Answer LLM's question
  app.post("/api/game/answer-llm", async (req, res) => {
    try {
      const { question, llmConfig } = req.body;
      
      // Validate question
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check game mode
      if (session.gameMode !== "v2") {
        return res.status(400).json({ error: "This endpoint is only available in V2 mode" });
      }
      
      // Check if maximum questions reached
      if (session.questionCount >= 20) {
        return res.status(400).json({ error: "Maximum questions reached" });
      }
      
      // Use the client-provided config if valid, otherwise fall back to session config
      const activeConfig = (llmConfig && llmConfig.answerer) ? llmConfig : session.llmConfig;
      
      // Get LLM to simulate user's answer using the appropriate API
      let answer;
      if (activeConfig?.answerer === "gemini") {
        answer = await simulateHumanAnswerGemini(session.word, question, session.questions);
      } else {
        answer = await simulateHumanAnswer(session.word, question, session.questions);
      }
      
      // Update the session
      session.questionCount += 1;
      session.questions.push({ question, answer, isLLMQuestion: true });
      await storage.updateGameSession(session);
      
      // Return the answer
      res.json({ question, answer, questionCount: session.questionCount });
    } catch (error) {
      console.error("Error processing LLM question:", error);
      res.status(500).json({ error: "Failed to process question" });
    }
  });
  
  // V2 Mode: LLM makes a final guess
  app.post("/api/game/llm-guess", async (req, res) => {
    try {
      const { llmConfig } = req.body;
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check game mode
      if (session.gameMode !== "v2") {
        return res.status(400).json({ error: "This endpoint is only available in V2 mode" });
      }
      
      // Use the client-provided config if valid, otherwise fall back to session config
      const activeConfig = (llmConfig && llmConfig.questioner && llmConfig.answerer) ? llmConfig : session.llmConfig;
      
      // Get LLM to make a guess using the appropriate API
      let guess;
      if (activeConfig?.questioner === "gemini") {
        guess = await makeGuessGemini(session.questions);
      } else {
        guess = await makeGuess(session.questions);
      }
      
      // Check if the guess is correct using the appropriate API
      let result;
      if (activeConfig?.answerer === "gemini") {
        result = await checkFinalGuessGemini(session.word, guess, session.questions);
      } else {
        result = await checkFinalGuess(session.word, guess, session.questions);
      }
      
      // End the game session
      await storage.endGameSession(session.id, result.correct);
      currentGameSessionId = null;
      
      // Return the result
      res.json({
        guess,
        correct: result.correct,
        feedback: result.feedback,
        word: session.word
      });
    } catch (error) {
      console.error("Error processing LLM guess:", error);
      res.status(500).json({ error: "Failed to process guess" });
    }
  });
  
  // Make final guess
  app.post("/api/game/guess", async (req, res) => {
    try {
      const { guess } = req.body;
      
      // Validate guess
      if (!guess || typeof guess !== "string") {
        return res.status(400).json({ error: "Guess is required" });
      }
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Check the guess using the appropriate API
      let result;
      if (session.llmConfig?.answerer === "gemini") {
        result = await checkFinalGuessGemini(session.word, guess, session.questions);
      } else {
        result = await checkFinalGuess(session.word, guess, session.questions);
      }
      
      // End the game session
      await storage.endGameSession(session.id, result.correct);
      currentGameSessionId = null;
      
      // Return the result
      res.json({
        correct: result.correct,
        feedback: result.feedback,
        word: session.word
      });
    } catch (error) {
      console.error("Error processing guess:", error);
      res.status(500).json({ error: "Failed to process guess" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      // For a full implementation, we would track comprehensive game statistics in a database
      // For now, we'll just return the current session stats
      const session = currentGameSessionId ? await storage.getGameSession(currentGameSessionId) : null;
      
      // Calculate game time if session is active
      let gameTimeInSeconds = 0;
      if (session?.startTime) {
        const currentTime = Date.now();
        gameTimeInSeconds = Math.floor((currentTime - session.startTime) / 1000);
      }
      
      res.json({
        currentGame: session ? {
          questionCount: session.questionCount,
          category: session.category,
          difficulty: session.difficulty,
          gameMode: session.gameMode,
          hintsUsed: session.hintsUsed,
          gameTimeInSeconds,
          active: session.active
        } : null,
        statistics: {
          gamesPlayed: 10, // Mock data for now - would be replaced with actual DB query
          gamesWon: 6,
          averageQuestions: 14,
          bestScore: 8,
          byCategory: {
            animal: { played: 3, won: 2 },
            place: { played: 2, won: 1 },
            object: { played: 4, won: 2 },
            food: { played: 1, won: 1 }
          },
          byDifficulty: {
            easy: { played: 3, won: 3 },
            medium: { played: 5, won: 2 },
            hard: { played: 2, won: 1 }
          }
        }
      });
    } catch (error) {
      console.error("Error getting statistics:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });
  
  // Pause or resume game
  app.post("/api/game/pause", async (req, res) => {
    try {
      const { pause = true } = req.body;
      
      // Validate game session
      if (!currentGameSessionId) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Get the game session
      const session = await storage.getGameSession(currentGameSessionId);
      if (!session || !session.active) {
        return res.status(400).json({ error: "No active game session" });
      }
      
      // Update pause state
      if (pause) {
        session.pauseTime = Date.now();
      } else {
        // If resuming, adjust the start time to account for the pause duration
        if (session.pauseTime) {
          const pauseDuration = Date.now() - session.pauseTime;
          session.startTime += pauseDuration;
          session.pauseTime = undefined;
        }
      }
      
      await storage.updateGameSession(session);
      
      res.json({ success: true, paused: pause });
    } catch (error) {
      console.error("Error pausing/resuming game:", error);
      res.status(500).json({ error: "Failed to pause/resume game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
