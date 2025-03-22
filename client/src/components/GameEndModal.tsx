import React from "react";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { LLMConfig } from "@/lib/types";

interface GameEndModalProps {
  open: boolean;
  result: "win" | "lose" | null;
  word: string;
  questionCount: number;
  onPlayAgain: () => void;
  feedback?: string;
  guess?: string;
  isLLMvsLLM?: boolean;
  llmConfig?: LLMConfig;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  open,
  result,
  word,
  questionCount,
  onPlayAgain,
  feedback,
  guess,
  isLLMvsLLM = false,
  llmConfig
}) => {
  const getQuestionerName = () => {
    if (!isLLMvsLLM || !llmConfig) return "You";
    return llmConfig.questioner === "openai" ? "OpenAI" : "Gemini";
  };

  const getAnswererName = () => {
    if (!isLLMvsLLM || !llmConfig) return "I";
    return llmConfig.answerer === "openai" ? "OpenAI" : "Gemini";
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md mx-auto">
        {result === "win" && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-poppins font-bold text-secondary mb-2">
              {isLLMvsLLM ? `${getQuestionerName()} Won!` : "Congratulations!"}
            </h2>
            {isLLMvsLLM ? (
              <>
                <p className="text-lg mb-2 font-open-sans">
                  {getQuestionerName()} guessed "{guess}".
                </p>
                <p className="text-sm mb-6 font-open-sans text-gray-600">
                  {feedback}
                </p>
              </>
            ) : (
              <p className="text-lg mb-6 font-open-sans">
                You guessed it! {getAnswererName()} was thinking of "{word}".
              </p>
            )}
            <p className="text-base mb-6 font-open-sans">
              {isLLMvsLLM ? `${getQuestionerName()} used` : "You used"} <span className="font-semibold text-primary">{questionCount}</span> out of 20 questions.
            </p>
          </div>
        )}
        
        {result === "lose" && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-accent rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-poppins font-bold text-accent mb-2">Game Over!</h2>
            {isLLMvsLLM ? (
              <>
                <p className="text-lg mb-2 font-open-sans">
                  {getAnswererName()} was thinking of "{word}".
                </p>
                <p className="text-sm mb-6 font-open-sans text-gray-600">
                  {getQuestionerName()} guessed "{guess}" but was incorrect. {feedback}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg mb-6 font-open-sans">
                  {getAnswererName()} was thinking of "{word}".
                </p>
                <p className="text-base mb-6 font-open-sans">
                  You used all 20 questions but couldn't guess the answer.
                </p>
              </>
            )}
          </div>
        )}
        
        <AlertDialogFooter className="flex justify-center">
          <Button
            onClick={onPlayAgain}
            className="bg-primary hover:bg-primary/90 text-white font-poppins font-medium py-3 px-8 rounded-lg shadow-md transition duration-300"
          >
            Play Again
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GameEndModal;
