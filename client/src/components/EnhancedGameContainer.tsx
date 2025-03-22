import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  GameState, 
  Question, 
  GameMode, 
  Difficulty, 
  WordCategory, 
  GameSettings, 
  GameStats 
} from "@/lib/types";
import QuestionCard from "./QuestionCard";
import GameEndModal from "./GameEndModal";
import { GameSettingsPanel } from "./GameSettings";
import { HintSystem } from "./HintSystem";
import { LLMvsLLMMode } from "./LLMvsLLMMode";
import { StatsDisplay } from "./StatsDisplay";
import { 
  Menu, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  BarChart,
  Pause,
  Play,
  StopCircle, 
  RotateCcw
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const EnhancedGameContainer: React.FC = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const questionInputRef = useRef<HTMLInputElement>(null);

  // Default game settings
  const defaultSettings: GameSettings = {
    gameMode: "v1",
    difficulty: "medium",
    categories: ["animal", "place", "object", "food"],
    showHints: true,
    llmConfig: {
      questioner: "openai",
      answerer: "openai"
    }
  };

  // Default game statistics
  const defaultStats: GameStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    averageQuestions: 0,
    bestScore: 20,
    completionTimes: []
  };

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    // Core game state
    questionCount: 0,
    isGameActive: false,
    questions: [],
    isHistoryCollapsed: false,
    
    // New features
    gameMode: "v1",
    difficulty: "medium",
    hintsUsed: 0,
    isPaused: false,
    showControlPanel: false,
    
    // For V2 mode
    waitingForLLMQuestion: false,
    waitingForLLMAnswer: false,
    llmConfig: {
      questioner: "openai",
      answerer: "openai"
    },
    
    // Statistics
    stats: defaultStats
  });

  // UI state
  const [thinking, setThinking] = useState(false);
  const [finalGuessMode, setFinalGuessMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<GameSettings>(defaultSettings);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState<"stats" | "settings" | null>(null);
  const [gameModeModalOpen, setGameModeModalOpen] = useState(false);

  // Latest question reference
  const latestQuestion = gameState.questions.length > 0
    ? gameState.questions[gameState.questions.length - 1]
    : null;

  const isPositiveResponse = latestQuestion?.answer?.toLowerCase().startsWith('yes');

  // Start a new game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ 
        success: boolean; 
        word?: string; 
        gameMode: string;
        category: string;
        difficulty: string;
        hints?: string[];
      }>("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameMode: currentSettings.gameMode,
          difficulty: currentSettings.difficulty,
          category: currentSettings.categories.length > 0 
            ? currentSettings.categories[Math.floor(Math.random() * currentSettings.categories.length)] 
            : undefined,
          llmConfig: currentSettings.llmConfig
        })
      });
    },
    onSuccess: (data) => {
      // Create a completely fresh game state instead of updating the previous one
      const newGameState: GameState = {
        // Core game state
        isGameActive: true,
        questionCount: 0,
        questions: [],
        isHistoryCollapsed: false,
        selectedWord: data.word,
        selectedCategory: data.category as WordCategory,
        gameResult: null,
        
        // New features
        gameMode: data.gameMode as GameMode,
        difficulty: data.difficulty as Difficulty,
        statusMessage: undefined,
        hints: data.hints || [],
        hintsUsed: 0,
        gameStartTime: Date.now(),
        isPaused: false,
        showControlPanel: false,
        
        // For V2 mode
        waitingForLLMQuestion: data.gameMode === "v2",
        waitingForLLMAnswer: false,
        currentLLMQuestion: undefined,
        llmConfig: currentSettings.llmConfig,
        
        // Keep the existing stats
        stats: gameState.stats
      };
      
      // Set the completely new state
      setGameState(newGameState);
      
      // Reset all other UI state
      setFinalGuessMode(false);
      setThinking(false);
      setSidebarOpen(null);
      setCurrentQuestion("");
      
      toast({
        title: "New Game Started",
        description: `Get ready to play in ${data.gameMode.toUpperCase()} mode with ${data.difficulty} difficulty!`,
      });
      
      // Focus the input field once the game starts
      setTimeout(() => {
        if (questionInputRef.current) {
          questionInputRef.current.focus();
        }
      }, 500);
    },
    onError: (error) => {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: "Failed to start a new game. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Ask question mutation
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      return apiRequest<{ question: string; answer: string }>("/api/game/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
    },
    onMutate: () => {
      setThinking(true);
    },
    onSuccess: (data) => {
      const newQuestion: Question = {
        id: gameState.questions.length + 1,
        text: data.question,
        answer: data.answer,
      };

      setGameState(prev => ({
        ...prev,
        questionCount: prev.questionCount + 1,
        questions: [...prev.questions, newQuestion],
      }));

      // Enable final guess mode if at 19 questions
      if (gameState.questionCount >= 19) {
        setFinalGuessMode(true);
        toast({
          title: "Final Question Used",
          description: "Time for your final guess! What do you think the word is?",
        });
      }

      // Clear the input
      if (questionInputRef.current) {
        questionInputRef.current.value = "";
      }
    },
    onError: (error) => {
      console.error("Error asking question:", error);
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setThinking(false);
    },
  });

  // Make final guess mutation
  const makeGuessMutation = useMutation({
    mutationFn: async (guess: string) => {
      return apiRequest<{ correct: boolean; feedback: string; word: string }>(
        "/api/game/guess",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guess }),
        }
      );
    },
    onMutate: () => {
      setThinking(true);
    },
    onSuccess: (data) => {
      setGameState(prev => ({
        ...prev,
        isGameActive: false,
        gameResult: data.correct ? "win" : "lose",
        selectedWord: data.word,
        
        // Update stats
        stats: {
          ...prev.stats,
          gamesPlayed: prev.stats.gamesPlayed + 1,
          gamesWon: data.correct ? prev.stats.gamesWon + 1 : prev.stats.gamesWon,
          averageQuestions: Math.round(
            (prev.stats.averageQuestions * prev.stats.gamesPlayed + prev.questionCount) / 
            (prev.stats.gamesPlayed + 1)
          ),
          bestScore: data.correct && prev.questionCount < prev.stats.bestScore 
            ? prev.questionCount 
            : prev.stats.bestScore,
          completionTimes: [...prev.stats.completionTimes, 
            Math.floor((Date.now() - (prev.gameStartTime || 0)) / 1000)]
        }
      }));
    },
    onError: (error) => {
      console.error("Error making guess:", error);
      toast({
        title: "Error",
        description: "Failed to process your guess. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setThinking(false);
    },
  });

  // Game pause mutation
  const pauseGameMutation = useMutation({
    mutationFn: async (pause: boolean) => {
      return apiRequest<{ success: boolean; paused: boolean }>("/api/game/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pause }),
      });
    },
    onSuccess: (data) => {
      setGameState(prev => ({
        ...prev,
        isPaused: data.paused
      }));
      
      toast({
        title: data.paused ? "Game Paused" : "Game Resumed",
        description: data.paused 
          ? "Take your time. The game has been paused." 
          : "Let's continue! The game has been resumed.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error pausing/resuming game:", error);
      toast({
        title: "Error",
        description: "Failed to pause/resume the game. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle asking a question
  const handleAskQuestion = () => {
    if (!gameState.isGameActive || thinking) return;

    const question = questionInputRef.current?.value?.trim();
    if (!question) {
      toast({
        title: "Empty Question",
        description: "Please enter a question before submitting.",
      });
      return;
    }

    askQuestionMutation.mutate(question);
  };

  // Handle making a final guess
  const handleFinalGuess = () => {
    if (!gameState.isGameActive || thinking) return;

    const guess = questionInputRef.current?.value?.trim();
    if (!guess) {
      toast({
        title: "Empty Guess",
        description: "Please enter your guess before submitting.",
      });
      return;
    }

    makeGuessMutation.mutate(guess);
  };

  // Handle key press events for the input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (finalGuessMode) {
        handleFinalGuess();
      } else {
        handleAskQuestion();
      }
    }
  };

  // Toggle history sidebar
  const toggleHistorySidebar = () => {
    setGameState(prev => ({
      ...prev,
      isHistoryCollapsed: !prev.isHistoryCollapsed,
    }));
  };

  // Start a new game
  const handleStartNewGame = () => {
    startGameMutation.mutate();
  };

  // Play again after game ends
  const handlePlayAgain = () => {
    // Close the modal first to avoid state conflicts
    setGameState(prev => ({ 
      ...prev, 
      gameResult: null 
    }));
    
    // Start a new game directly - the mutation success handler will reset all the game state
    startGameMutation.mutate();
    
    // Reset additional state variables that might be causing issues
    setFinalGuessMode(false);
    setThinking(false);
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: GameSettings) => {
    setCurrentSettings(newSettings);
  };

  // Handle pausing/resuming the game
  const handlePauseToggle = (pause: boolean) => {
    if (gameState.isGameActive) {
      pauseGameMutation.mutate(pause);
    }
  };

  // Handle stopping the game
  const handleStopGame = () => {
    if (gameState.isGameActive) {
      // API call to stop the game
      apiRequest("/api/game/stop", { method: "POST" })
        .then(() => {
          setGameState(prev => ({
            ...prev,
            isGameActive: false,
            gameResult: null
          }));
          
          toast({
            title: "Game Stopped",
            description: "The game has been stopped.",
          });
        })
        .catch(error => {
          console.error("Error stopping game:", error);
          toast({
            title: "Error",
            description: "Failed to stop the game. Please try again.",
            variant: "destructive",
          });
        });
    }
  };

  // Handle hint usage
  const handleHintUsed = (hint: string) => {
    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1
    }));
    
    toast({
      title: "Hint Used",
      description: `You've used ${gameState.hintsUsed + 1} hint(s).`,
    });
  };

  // Handle LLM game end
  const handleLLMGameEnd = (result: { correct: boolean, feedback: string, word: string, guess: string, questionCount: number }) => {
    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      gameResult: result.correct ? "win" : "lose",
      selectedWord: result.word,
      statusMessage: result.feedback,
      currentLLMQuestion: result.guess,
      questionCount: result.questionCount, // Use the actual question count from the response
      
      // Update stats
      stats: {
        ...prev.stats,
        gamesPlayed: prev.stats.gamesPlayed + 1,
        gamesWon: result.correct ? prev.stats.gamesWon + 1 : prev.stats.gamesWon,
        averageQuestions: Math.round(
          (prev.stats.averageQuestions * prev.stats.gamesPlayed + result.questionCount) / 
          (prev.stats.gamesPlayed + 1)
        ),
        bestScore: result.correct && result.questionCount < prev.stats.bestScore 
          ? result.questionCount 
          : prev.stats.bestScore,
        completionTimes: [...prev.stats.completionTimes, 
          Math.floor((Date.now() - (prev.gameStartTime || 0)) / 1000)]
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 md:py-8 md:px-6 lg:px-8">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-wrap justify-between items-center">
          <h1 className="text-3xl font-poppins font-bold text-primary mb-2 md:mb-0">
            20 Questions Game
          </h1>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              className="flex items-center"
              onClick={() => setSidebarOpen(sidebarOpen === "stats" ? null : "stats")}
            >
              <BarChart className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Statistics</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex items-center"
              onClick={() => setSidebarOpen(sidebarOpen === "settings" ? null : "settings")}
            >
              <Settings className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            
            <Button
              variant="default"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setGameModeModalOpen(true)}
              disabled={startGameMutation.isPending}
            >
              New Game
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Side Panel for Stats or Settings */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(null)}>
            <div 
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg p-6 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                onClick={() => setSidebarOpen(null)}
              >
                ✕
              </Button>
              
              {sidebarOpen === "stats" ? (
                <div className="pt-10">
                  <StatsDisplay />
                </div>
              ) : (
                <div className="pt-10">
                  <GameSettingsPanel 
                    settings={currentSettings}
                    onSettingsChange={handleSettingsChange}
                    onClose={() => setSidebarOpen(null)}
                    onStartGame={handleStartNewGame}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* V1 Mode: Human asks questions */}
        {gameState.gameMode === "v1" && (
          <div>
            {/* Game Controls */}
            {gameState.isGameActive && (
              <div className="mb-6 bg-white rounded-xl shadow-sm p-4 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center">
                  <Badge className="mr-3 bg-indigo-100 text-indigo-800 border-none">
                    {gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 border-none capitalize">
                    {gameState.selectedCategory || "Random"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={gameState.isPaused ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePauseToggle(!gameState.isPaused)}
                    className="flex items-center"
                  >
                    {gameState.isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopGame}
                    className="flex items-center"
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop Layout */}
            {!isMobile && (
              <div className="hidden md:flex gap-6">
                {/* Left Column - Question History (60%) */}
                <div
                  className={`${
                    gameState.isHistoryCollapsed ? "w-0 opacity-0" : "w-3/5 opacity-100"
                  } bg-white rounded-2xl shadow-md flex flex-col transition-all duration-300 overflow-hidden`}
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-poppins font-semibold text-lg">Question History</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleHistorySidebar}
                      className="text-primary hover:text-primary/70 transition"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                      {gameState.questions.length === 0 ? (
                        <div className="text-gray-400 text-center p-6">
                          Your question history will appear here...
                        </div>
                      ) : (
                        gameState.questions.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            isPositive={question.answer.toLowerCase().startsWith('yes')}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side - Main Game Area (40% or 100% if history is collapsed) */}
                <div
                  className={`${
                    gameState.isHistoryCollapsed ? "w-full" : "w-2/5"
                  } transition-all duration-300`}
                >
                  {/* History Toggle Button (only when collapsed) */}
                  {gameState.isHistoryCollapsed && (
                    <Button
                      variant="outline"
                      onClick={toggleHistorySidebar}
                      className="mb-4 text-primary border-primary hover:bg-primary/10"
                    >
                      <ChevronRight className="h-5 w-5 mr-1" />
                      Show History
                    </Button>
                  )}

                  {/* Game Area */}
                  <div className="bg-white rounded-2xl shadow-md p-6 h-full flex flex-col">
                    {!gameState.isGameActive ? (
                      // Start Game Area
                      <div className="h-full flex flex-col items-center justify-center">
                        <h2 className="text-2xl font-poppins font-semibold mb-4 text-center">
                          Welcome to 20 Questions!
                        </h2>
                        <p className="text-base text-textColor mb-8 text-center max-w-md">
                          I'll think of something, and you'll try to guess it by asking yes/no questions.
                          You have 20 questions to figure it out!
                        </p>
                        <Button
                          onClick={handleStartNewGame}
                          className="w-full max-w-xs bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                          disabled={startGameMutation.isPending}
                        >
                          {startGameMutation.isPending ? "Starting..." : "Start Game"}
                        </Button>
                      </div>
                    ) : (
                      // Active Game Area
                      <div className="flex flex-col h-full">
                        {/* Response Display */}
                        <div className="flex-grow flex flex-col items-center justify-center">
                          {thinking ? (
                            <div className="mb-6 response-animation">
                              <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-primary bg-opacity-20 flex items-center justify-center pulse-animation">
                                  <div className="w-12 h-12 rounded-full bg-primary bg-opacity-40 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full bg-primary"></div>
                                  </div>
                                </div>
                                <p className="text-center mt-3 font-poppins text-textColor font-medium">
                                  I'm thinking...
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center mb-6 response-animation">
                              <h3 className={`text-3xl font-poppins font-bold mb-2 ${latestQuestion ? (isPositiveResponse ? 'text-green-600' : 'text-red-600') : 'text-indigo-700'}`}>
                                {latestQuestion ? (isPositiveResponse ? 'Yes' : 'No') : "Let's Play!"}
                              </h3>
                              <p className="text-lg text-textColor font-open-sans">
                                {latestQuestion 
                                  ? latestQuestion.answer 
                                  : "I'm thinking of something. Ask me yes/no questions to guess what it is!"}
                              </p>
                            </div>
                          )}
                          
                          {/* Hints System - Only display when showHints is true in current settings */}
                          {currentSettings.showHints === true && gameState.hints && gameState.hints.length > 0 && (
                            <div className="w-full mb-6">
                              <HintSystem 
                                gameActive={gameState.isGameActive && !gameState.isPaused}
                                hintsUsed={gameState.hintsUsed}
                                onHintReceived={handleHintUsed}
                              />
                            </div>
                          )}
                          
                          <div className="text-center">
                            <div className="bg-gray-100 px-8 py-4 rounded-2xl inline-block">
                              <p className="font-poppins font-medium flex items-baseline gap-1">
                                <span className="text-3xl text-indigo-600 font-bold">{gameState.questionCount}</span>
                                <span className="text-lg text-gray-700">/ 20 Questions</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Question Input Area */}
                        <div className="mt-6 space-y-4">
                          <div>
                            <label htmlFor="questionInput" className="block text-textColor text-sm font-medium mb-2">
                              {finalGuessMode ? "Your Final Guess:" : "Your Question:"}
                            </label>
                            <Input
                              ref={questionInputRef}
                              id="questionInput"
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition duration-300 font-open-sans"
                              placeholder={finalGuessMode ? "Is it a dog?" : "Is it alive?"}
                              disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                              onKeyPress={handleKeyPress}
                            />
                          </div>
                          
                          {finalGuessMode ? (
                            <Button
                              onClick={handleFinalGuess}
                              disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                              className="w-full bg-accent hover:bg-accent/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                            >
                              Submit Final Answer
                            </Button>
                          ) : (
                            <Button
                              onClick={handleAskQuestion}
                              disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                              className="w-full bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
                            >
                              <span>Ask Question</span>
                              <ChevronRight className="h-5 w-5 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Layout */}
            {isMobile && (
              <div className="md:hidden flex flex-col gap-4">
                {/* Top - Question History */}
                <div className="bg-white rounded-2xl shadow-md">
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="font-poppins font-semibold text-lg">Question History</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleHistorySidebar}
                      className="text-primary hover:text-primary/70 transition"
                    >
                      {gameState.isHistoryCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
                    </Button>
                  </div>
                  {!gameState.isHistoryCollapsed && (
                    <div className="overflow-x-auto custom-scrollbar p-4 flex space-x-3">
                      {gameState.questions.map((question) => (
                        <div key={question.id} className="flex-shrink-0 w-60 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="font-open-sans text-sm">
                            <p className="font-semibold text-gray-800">Q{question.id}: {question.text}</p>
                            <p className={`mt-1 font-medium ${question.answer.toLowerCase().startsWith('yes') ? "text-green-600" : "text-red-600"}`}>
                              {question.answer}
                            </p>
                          </div>
                        </div>
                      ))}
                      {gameState.questions.length === 0 && (
                        <div className="flex-shrink-0 w-60 bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-center">
                          <p className="text-gray-400">No questions yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Middle - Game Area */}
                {!gameState.isGameActive ? (
                  // Start Game Area Mobile
                  <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col">
                    <h2 className="text-xl font-poppins font-semibold mb-3 text-center">
                      Welcome to 20 Questions!
                    </h2>
                    <p className="text-sm text-textColor mb-4 text-center">
                      I'll think of something, and you'll try to guess it by asking yes/no questions.
                    </p>
                    <Button
                      onClick={handleStartNewGame}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                      disabled={startGameMutation.isPending}
                    >
                      {startGameMutation.isPending ? "Starting..." : "Start Game"}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Game Response Area Mobile */}
                    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center">
                      {thinking ? (
                        <div className="mb-4 response-animation">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center pulse-animation">
                              <div className="w-10 h-10 rounded-full bg-primary bg-opacity-40 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-primary"></div>
                              </div>
                            </div>
                            <p className="text-center mt-3 font-poppins text-textColor font-medium text-sm">
                              I'm thinking...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center mb-4 response-animation">
                          <h3 className={`text-3xl font-poppins font-bold mb-2 ${latestQuestion ? (isPositiveResponse ? 'text-green-600' : 'text-red-600') : 'text-indigo-700'}`}>
                            {latestQuestion ? (isPositiveResponse ? 'Yes' : 'No') : "Let's Play!"}
                          </h3>
                          <p className="text-base text-textColor font-open-sans">
                            {latestQuestion 
                              ? latestQuestion.answer 
                              : "I'm thinking of something. Ask me yes/no questions to guess what it is!"}
                          </p>
                        </div>
                      )}
                      
                      {/* Hints System Mobile */}
                      {currentSettings.showHints === true && gameState.hints && gameState.hints.length > 0 && (
                        <div className="w-full mb-4">
                          <HintSystem 
                            gameActive={gameState.isGameActive && !gameState.isPaused}
                            hintsUsed={gameState.hintsUsed}
                            onHintReceived={handleHintUsed}
                          />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className="bg-gray-100 px-6 py-3 rounded-xl inline-block">
                          <p className="font-poppins font-medium flex items-baseline gap-1">
                            <span className="text-2xl text-indigo-600 font-bold">{gameState.questionCount}</span>
                            <span className="text-sm text-gray-700">/ 20 Questions</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Question Input Area Mobile */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                      <h2 className="text-xl font-poppins font-semibold mb-4 text-center">
                        {finalGuessMode ? "Make Your Final Guess" : "Ask a Yes/No Question"}
                      </h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="questionInputMobile" className="block text-textColor text-sm font-medium mb-2">
                            {finalGuessMode ? "Your Guess:" : "Your Question:"}
                          </label>
                          <Input
                            ref={questionInputRef}
                            id="questionInputMobile"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition duration-300 font-open-sans"
                            placeholder={finalGuessMode ? "Is it a dog?" : "Is it alive?"}
                            disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                            onKeyPress={handleKeyPress}
                          />
                        </div>
                        
                        {finalGuessMode ? (
                          <div>
                            <Button
                              onClick={handleFinalGuess}
                              disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                              className="w-full bg-accent hover:bg-accent/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                            >
                              Submit Final Answer
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Button
                              onClick={handleAskQuestion}
                              disabled={!gameState.isGameActive || thinking || gameState.isPaused}
                              className="w-full bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
                            >
                              <span>Ask Question</span>
                              <ChevronRight className="h-5 w-5 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* V2 Mode: LLM vs LLM */}
        {gameState.gameMode === "v2" && (
          <LLMvsLLMMode 
            onGameEnd={handleLLMGameEnd}
            onHintUsed={handleHintUsed}
            hintsUsed={gameState.hintsUsed}
            isPaused={gameState.isPaused}
            onPauseToggle={handlePauseToggle}
            difficulty={gameState.difficulty}
            category={gameState.selectedCategory || "unknown"}
            llmConfig={gameState.llmConfig}
            showHints={currentSettings.showHints}
          />
        )}
      </main>

      {/* Game End Modal */}
      <GameEndModal
        open={gameState.gameResult === "win" || gameState.gameResult === "lose"}
        result={gameState.gameResult || null}
        word={gameState.selectedWord || ""}
        questionCount={gameState.questionCount}
        onPlayAgain={handlePlayAgain}
        onClose={() => setGameState(prev => ({ ...prev, gameResult: null }))}
        feedback={gameState.statusMessage}
        guess={gameState.currentLLMQuestion}
        isLLMvsLLM={gameState.gameMode === "v2"}
        llmConfig={gameState.llmConfig}
      />
    </div>
  );
};

export default EnhancedGameContainer;