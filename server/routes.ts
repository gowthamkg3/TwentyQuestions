import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { selectRandomWord, answerQuestion, checkFinalGuess } from "./openai";

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
      // Get a random word from OpenAI
      const word = await selectRandomWord();
      
      // Create a new game session
      const session = await storage.createGameSession(word);
      currentGameSessionId = session.id;
      
      console.log(`New game started with word: ${word}`);
      
      // Return success (in production, we would NOT return the actual word to the client)
      if (process.env.NODE_ENV === "production") {
        res.json({ success: true });
      } else {
        res.json({ success: true, word });
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
      
      // Check the guess using OpenAI
      const result = await checkFinalGuess(
        session.word, 
        guess, 
        session.questions
      );
      
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

  const httpServer = createServer(app);
  return httpServer;
}
