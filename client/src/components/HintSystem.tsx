import React from 'react';
import { Button } from '@/components/ui/button';
import { LightbulbIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HintSystemProps {
  gameActive: boolean;
  hintsUsed: number;
  onHintReceived: (hint: string) => void;
}

export function HintSystem({ gameActive, hintsUsed, onHintReceived }: HintSystemProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentHint, setCurrentHint] = React.useState<string | null>(null);
  const [totalHints, setTotalHints] = React.useState(3); // Assume 3 hints by default
  const { toast } = useToast();

  const requestHint = async () => {
    if (!gameActive) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest<{ hint: string; hintsUsed: number; totalHints: number }>('/api/game/hint', {
        method: 'POST'
      });
      
      setCurrentHint(response.hint);
      setTotalHints(response.totalHints);
      onHintReceived(response.hint);
      
      toast({
        title: "Hint Revealed",
        description: "A new hint has been provided to help you.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error getting hint:", error);
      toast({
        title: "Couldn't Get Hint",
        description: "There was an issue retrieving a hint. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate remaining hints
  const remainingHints = totalHints - hintsUsed;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold">Need a hint?</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{remainingHints} hints remaining</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-1"
                  onClick={requestHint}
                  disabled={!gameActive || remainingHints <= 0 || isLoading}
                >
                  <LightbulbIcon className="h-4 w-4 text-yellow-500" />
                  <span>Get Hint</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Request a hint to help you guess the word</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {currentHint && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <LightbulbIcon className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Hint {hintsUsed} of {totalHints}</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {currentHint}
          </AlertDescription>
        </Alert>
      )}
      
      {remainingHints <= 0 && hintsUsed > 0 && (
        <p className="text-sm text-gray-500 italic">No more hints available for this word.</p>
      )}
    </div>
  );
}