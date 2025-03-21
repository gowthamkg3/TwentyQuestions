import React from "react";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";

interface GameEndModalProps {
  open: boolean;
  result: "win" | "lose" | null;
  word: string;
  questionCount: number;
  onPlayAgain: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  open,
  result,
  word,
  questionCount,
  onPlayAgain
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md mx-auto">
        {result === "win" && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-poppins font-bold text-secondary mb-2">Congratulations!</h2>
            <p className="text-lg mb-6 font-open-sans">
              You guessed it! I was thinking of "{word}".
            </p>
            <p className="text-base mb-6 font-open-sans">
              You used <span className="font-semibold text-primary">{questionCount}</span> out of 20 questions.
            </p>
          </div>
        )}
        
        {result === "lose" && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-accent rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-poppins font-bold text-accent mb-2">Game Over!</h2>
            <p className="text-lg mb-6 font-open-sans">
              I was thinking of "{word}".
            </p>
            <p className="text-base mb-6 font-open-sans">
              You used all 20 questions but couldn't guess the answer.
            </p>
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
