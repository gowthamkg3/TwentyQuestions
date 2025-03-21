import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GameState, Question } from "@/lib/types";
import QuestionCard from "./QuestionCard";
import GameEndModal from "./GameEndModal";
import { Menu, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const GameContainer: React.FC = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const questionInputRef = useRef<HTMLInputElement>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    questionCount: 0,
    isGameActive: false,
    questions: [],
    isHistoryCollapsed: false,
  });

  const [thinking, setThinking] = useState(false);
  const [finalGuessMode, setFinalGuessMode] = useState(false);
  
  // Start a new game
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/game/start", {});
      return response.json();
    },
    onSuccess: (data) => {
      setGameState({
        questionCount: 0,
        isGameActive: true,
        questions: [],
        isHistoryCollapsed: false,
        selectedWord: data.word, // This will be hidden from the client in production
      });
      setThinking(false);
      setFinalGuessMode(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to start game",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Ask a question
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/game/ask", { question });
      return response.json();
    },
    onSuccess: (data) => {
      setThinking(false);
      
      // Add new question to state
      setGameState((prev) => {
        const newQuestions = [
          ...prev.questions, 
          { 
            id: prev.questionCount + 1, 
            text: data.question, 
            answer: data.answer 
          }
        ];
        
        const newCount = prev.questionCount + 1;
        
        // Check if we should enter final guess mode
        if (newCount === 19) {
          setFinalGuessMode(true);
        }
        
        // Check if game should end
        if (newCount >= 20) {
          return {
            ...prev,
            questionCount: newCount,
            questions: newQuestions,
            isGameActive: false,
            gameResult: "lose"
          };
        }
        
        return {
          ...prev,
          questionCount: newCount,
          questions: newQuestions
        };
      });
      
      if (questionInputRef.current) {
        questionInputRef.current.value = "";
        questionInputRef.current.focus();
      }
    },
    onError: (error) => {
      setThinking(false);
      toast({
        title: "Failed to process question",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Make final guess
  const makeFinalGuessMutation = useMutation({
    mutationFn: async (guess: string) => {
      const response = await apiRequest("POST", "/api/game/guess", { guess });
      return response.json();
    },
    onSuccess: (data) => {
      setThinking(false);
      setGameState((prev) => ({
        ...prev,
        isGameActive: false,
        gameResult: data.correct ? "win" : "lose",
        selectedWord: data.word,
      }));
      
      if (questionInputRef.current) {
        questionInputRef.current.value = "";
      }
    },
    onError: (error) => {
      setThinking(false);
      toast({
        title: "Failed to process guess",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle history sidebar
  const toggleHistorySidebar = () => {
    setGameState(prev => ({
      ...prev,
      isHistoryCollapsed: !prev.isHistoryCollapsed
    }));
  };
  
  // Handle asking a question
  const handleAskQuestion = () => {
    if (!gameState.isGameActive || thinking) return;
    
    const question = questionInputRef.current?.value.trim();
    if (!question) {
      toast({
        title: "Empty question",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }
    
    setThinking(true);
    askQuestionMutation.mutate(question);
  };
  
  // Handle making a final guess
  const handleFinalGuess = () => {
    if (!gameState.isGameActive || thinking) return;
    
    const guess = questionInputRef.current?.value.trim();
    if (!guess) {
      toast({
        title: "Empty guess",
        description: "Please enter your final guess",
        variant: "destructive",
      });
      return;
    }
    
    setThinking(true);
    makeFinalGuessMutation.mutate(guess);
  };
  
  // Handle "Enter" key press in input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (finalGuessMode) {
        handleFinalGuess();
      } else {
        handleAskQuestion();
      }
    }
  };
  
  // Start new game
  const startNewGame = () => {
    startGameMutation.mutate();
  };
  
  // Handle play again
  const handlePlayAgain = () => {
    startNewGame();
  };
  
  // Start game on component mount
  useEffect(() => {
    startNewGame();
  }, []);

  const getLatestQuestion = (): Question | null => {
    return gameState.questions.length > 0
      ? gameState.questions[gameState.questions.length - 1]
      : null;
  };

  const latestQuestion = getLatestQuestion();
  const isPositiveResponse = latestQuestion?.answer.toLowerCase().startsWith('yes');
  
  return (
    <div className="flex flex-col min-h-screen bg-background font-open-sans text-textColor">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-poppins font-bold">Twenty Questions</h1>
          <div className="flex items-center">
            <Button
              onClick={startNewGame}
              disabled={startGameMutation.isPending}
              className="bg-secondary hover:bg-secondary/80 text-white px-4 py-2 rounded-lg font-poppins font-medium shadow-md transition duration-300"
            >
              New Game
            </Button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Desktop Layout */}
        {!isMobile && (
          <div className="hidden md:flex h-[calc(100vh-140px)] gap-4">
            {/* Left Column - Question History (20%) */}
            <div
              className={`${
                gameState.isHistoryCollapsed
                  ? "w-12 p-0"
                  : "w-1/5"
              } bg-white rounded-2xl shadow-md flex flex-col transition-all duration-300`}
            >
              <div className={`flex justify-between items-center p-4 ${gameState.isHistoryCollapsed ? "justify-center" : "border-b"}`}>
                {!gameState.isHistoryCollapsed && <h2 className="font-poppins font-semibold text-lg">Question History</h2>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleHistorySidebar}
                  className="text-primary hover:text-primary/70 transition"
                >
                  {gameState.isHistoryCollapsed ? (
                    <ChevronRight className="h-6 w-6" />
                  ) : (
                    <ChevronLeft className="h-6 w-6" />
                  )}
                </Button>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-3">
                {gameState.questions.map((question) => (
                  <QuestionCard 
                    key={question.id} 
                    question={question} 
                    isPositive={question.answer.toLowerCase().startsWith('yes')} 
                  />
                ))}
              </div>
            </div>

            {/* Middle Column - LLM Response Area (40%) */}
            <div 
              className={`${
                gameState.isHistoryCollapsed ? "w-1/2" : "w-2/5"
              } flex flex-col bg-white rounded-2xl shadow-md p-6 transition-all duration-300`}
            >
              <div className="flex-grow flex flex-col items-center justify-center">
                {thinking ? (
                  <div className="mb-8 response-animation">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-primary bg-opacity-20 flex items-center justify-center pulse-animation">
                        <div className="w-16 h-16 rounded-full bg-primary bg-opacity-40 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-primary"></div>
                        </div>
                      </div>
                      <p className="text-center mt-4 font-poppins text-textColor font-medium">
                        I'm thinking...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-8 response-animation">
                    <h3 className={`text-4xl font-poppins font-bold mb-2 ${latestQuestion ? (isPositiveResponse ? 'text-secondary' : 'text-accent') : 'text-primary'}`}>
                      {latestQuestion ? (isPositiveResponse ? 'Yes' : 'No') : "Let's Play!"}
                    </h3>
                    <p className="text-lg text-textColor font-open-sans">
                      {latestQuestion 
                        ? latestQuestion.answer 
                        : "I'm thinking of something. Ask me yes/no questions to guess what it is!"}
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="bg-primary bg-opacity-10 px-8 py-4 rounded-2xl inline-block">
                    <p className="font-poppins font-medium">
                      <span className="text-3xl text-primary font-bold">{gameState.questionCount}</span>
                      <span className="text-lg">/ 20 Questions</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - User Question Input (40%) */}
            <div
              className={`${
                gameState.isHistoryCollapsed ? "w-1/2" : "w-2/5"
              } bg-white rounded-2xl shadow-md flex flex-col transition-all duration-300 p-6`}
            >
              <div className="flex-grow flex flex-col justify-center">
                <h2 className="text-2xl font-poppins font-semibold mb-6 text-center">
                  {finalGuessMode ? "Make Your Final Guess" : "Ask a Yes/No Question"}
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="questionInput" className="block text-textColor text-sm font-medium mb-2">
                      {finalGuessMode ? "Your Guess:" : "Your Question:"}
                    </label>
                    <Input
                      ref={questionInputRef}
                      id="questionInput"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition duration-300 font-open-sans"
                      placeholder={finalGuessMode ? "Is it a dog?" : "Is it alive?"}
                      disabled={!gameState.isGameActive || thinking}
                      onKeyPress={handleKeyPress}
                    />
                  </div>
                  
                  {finalGuessMode ? (
                    <div>
                      <Button
                        onClick={handleFinalGuess}
                        disabled={!gameState.isGameActive || thinking}
                        className="w-full bg-accent hover:bg-accent/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                      >
                        Submit Final Answer
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Button
                        onClick={handleAskQuestion}
                        disabled={!gameState.isGameActive || thinking}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
                      >
                        <span>Ask Question</span>
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-gray-500 text-center font-open-sans">
                  {finalGuessMode 
                    ? "This is your final chance to guess what I'm thinking of!" 
                    : "Ask strategic questions to figure out what I'm thinking!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="md:hidden flex flex-col h-[calc(100vh-140px)] gap-4">
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
                        <p className="font-semibold text-primary">Q{question.id}: {question.text}</p>
                        <p className={`mt-1 ${question.answer.toLowerCase().startsWith('yes') ? "text-secondary" : "text-accent"}`}>
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

            {/* Middle - LLM Response Area */}
            <div className="flex-grow bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center">
              {thinking ? (
                <div className="mb-6 response-animation">
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
                  <h3 className={`text-3xl font-poppins font-bold mb-2 ${latestQuestion ? (isPositiveResponse ? 'text-secondary' : 'text-accent') : 'text-primary'}`}>
                    {latestQuestion ? (isPositiveResponse ? 'Yes' : 'No') : "Let's Play!"}
                  </h3>
                  <p className="text-base text-textColor font-open-sans">
                    {latestQuestion 
                      ? latestQuestion.answer 
                      : "I'm thinking of something. Ask me yes/no questions to guess what it is!"}
                  </p>
                </div>
              )}
              
              <div className="text-center">
                <div className="bg-primary bg-opacity-10 px-6 py-3 rounded-xl inline-block">
                  <p className="font-poppins font-medium">
                    <span className="text-2xl text-primary font-bold">{gameState.questionCount}</span>
                    <span className="text-sm">/ 20 Questions</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom - User Question Input */}
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
                    disabled={!gameState.isGameActive || thinking}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                
                {finalGuessMode ? (
                  <div>
                    <Button
                      onClick={handleFinalGuess}
                      disabled={!gameState.isGameActive || thinking}
                      className="w-full bg-accent hover:bg-accent/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300"
                    >
                      Submit Final Answer
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button
                      onClick={handleAskQuestion}
                      disabled={!gameState.isGameActive || thinking}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
                    >
                      <span>Ask Question</span>
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Game End Modal */}
      <GameEndModal
        open={gameState.gameResult === "win" || gameState.gameResult === "lose"}
        result={gameState.gameResult || null}
        word={gameState.selectedWord || ""}
        questionCount={gameState.questionCount}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
};

export default GameContainer;
