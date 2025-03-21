import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QuestionCard from './QuestionCard';
import { HintSystem } from './HintSystem';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Question, LLMConfig } from '@/lib/types';
import { Brain, Cpu, MessageCircle, FastForward, Play, Pause, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface LLMvsLLMModeProps {
  onGameEnd: (result: { correct: boolean, feedback: string, word: string }) => void;
  onHintUsed: (hint: string) => void;
  hintsUsed: number;
  isPaused: boolean;
  onPauseToggle: (isPaused: boolean) => void;
  difficulty: string;
  category: string;
  llmConfig: LLMConfig;
}

export function LLMvsLLMMode({ 
  onGameEnd, 
  onHintUsed, 
  hintsUsed, 
  isPaused, 
  onPauseToggle,
  difficulty,
  category,
  llmConfig
}: LLMvsLLMModeProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGameActive, setIsGameActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(3000); // 3 seconds between questions
  const { toast } = useToast();

  // Handles the automated question-answer flow
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoPlay && isGameActive && !isPaused && questionCount < 20) {
      intervalId = setInterval(() => {
        getNextLLMQuestion();
      }, autoPlaySpeed);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoPlay, isGameActive, isPaused, questionCount]);

  // Gets the next question from the LLM
  const getNextLLMQuestion = async () => {
    if (isLoading || questionCount >= 20 || !isGameActive || isPaused) return;
    
    setIsLoading(true);
    try {
      // First, get a question from the LLM with the configured questioner
      const questionResponse = await apiRequest<{ question: string, questionCount: number }>('/api/game/llm-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig })
      });
      
      // Then, get the answer to that question using the configured answerer
      const answerResponse = await apiRequest<{ question: string, answer: string, questionCount: number }>('/api/game/answer-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: questionResponse.question,
          llmConfig 
        })
      });
      
      // Update the state with the new question and answer
      const newQuestion: Question = {
        id: questions.length + 1,
        text: answerResponse.question,
        answer: answerResponse.answer,
        isLLMQuestion: true
      };
      
      setQuestions(prev => [...prev, newQuestion]);
      setQuestionCount(answerResponse.questionCount);
      
      // If we've reached 20 questions, let the LLM make a final guess
      if (answerResponse.questionCount >= 20) {
        makeLLMFinalGuess();
      }
    } catch (error) {
      console.error("Error in LLM conversation:", error);
      toast({
        title: "Error",
        description: "There was an error during the LLM conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Makes the final guess
  const makeLLMFinalGuess = async () => {
    if (!isGameActive) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest<{ 
        guess: string, 
        correct: boolean, 
        feedback: string, 
        word: string 
      }>('/api/game/llm-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig })
      });
      
      setIsGameActive(false);
      onGameEnd(response);
      
      toast({
        title: response.correct ? "LLM Won!" : "LLM Lost!",
        description: `The LLM guessed "${response.guess}". ${response.feedback}`,
        variant: response.correct ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error making final guess:", error);
      toast({
        title: "Error",
        description: "There was an error processing the final guess. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle immediate skip to the end
  const handleSkipToEnd = () => {
    makeLLMFinalGuess();
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
    if (!autoPlay) {
      toast({
        title: "Auto-Play Enabled",
        description: "The LLMs will automatically ask and answer questions.",
        variant: "default"
      });
    }
  };

  // Change auto-play speed
  const changeAutoPlaySpeed = () => {
    // Cycle through different speeds
    if (autoPlaySpeed === 3000) {
      setAutoPlaySpeed(2000);
      toast({ description: "Speed: Fast (2s)" });
    } else if (autoPlaySpeed === 2000) {
      setAutoPlaySpeed(1000);
      toast({ description: "Speed: Very Fast (1s)" });
    } else {
      setAutoPlaySpeed(3000);
      toast({ description: "Speed: Normal (3s)" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Game Info Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Brain className="h-5 w-5 text-indigo-600 mr-2" />
            LLM vs LLM Mode
          </h2>
          <p className="text-sm text-gray-500">
            Watch as one AI tries to guess what another AI is thinking
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize bg-gray-50">{category}</Badge>
          <Badge variant="outline" className="capitalize bg-gray-50">{difficulty}</Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
            {questionCount}/20 Questions
          </Badge>
        </div>
      </div>
      
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isPaused ? "default" : "outline"}
                onClick={() => onPauseToggle(!isPaused)}
                disabled={!isGameActive}
              >
                {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              
              <Button
                size="sm"
                variant={autoPlay ? "default" : "outline"}
                onClick={toggleAutoPlay}
                disabled={!isGameActive || isPaused}
              >
                <Cpu className="h-4 w-4 mr-1" />
                {autoPlay ? "Stop Auto" : "Auto Play"}
              </Button>
              
              {autoPlay && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={changeAutoPlaySpeed}
                  disabled={!isGameActive || isPaused}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {autoPlaySpeed === 3000 ? "Normal" : autoPlaySpeed === 2000 ? "Fast" : "Very Fast"}
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={getNextLLMQuestion}
                disabled={isLoading || !isGameActive || isPaused || questionCount >= 20 || autoPlay}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Next Question
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSkipToEnd}
                disabled={isLoading || !isGameActive || isPaused}
              >
                <FastForward className="h-4 w-4 mr-1" />
                Skip to End
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Hints System */}
      <HintSystem
        gameActive={isGameActive && !isPaused}
        hintsUsed={hintsUsed}
        onHintReceived={onHintUsed}
      />
      
      {/* Questions Area */}
      <div className="space-y-3">
        <h3 className="text-md font-semibold">Conversation History</h3>
        
        {questions.length === 0 ? (
          <Card className="bg-gray-50 p-4 text-center text-gray-500">
            <p>The conversation will appear here once it begins</p>
            {!autoPlay && isGameActive && !isPaused && (
              <Button
                className="mt-2"
                variant="outline"
                size="sm"
                onClick={getNextLLMQuestion}
                disabled={isLoading}
              >
                Start Conversation
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <QuestionCard 
                key={question.id} 
                question={question} 
                isPositive={question.answer.toLowerCase().startsWith('yes')} 
              />
            ))}
            
            {isLoading && (
              <div className="animate-pulse flex space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            )}
            
            {!isGameActive && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                <p className="text-blue-800 font-medium">Game completed! Check the results above.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}