
import React from 'react';
import { Button } from './ui/button';
import { PauseIcon, PlayIcon, Square as StopIcon, RefreshCwIcon } from 'lucide-react';

interface ControlPanelProps {
  isPaused: boolean;
  onPause: () => void;
  onStop: () => void;
  onNewGame: () => void;
}

export function ControlPanel({ isPaused, onPause, onStop, onNewGame }: ControlPanelProps) {
  return (
    <div className="flex gap-2 justify-center my-4">
      <Button 
        variant="outline" 
        onClick={onPause}
        className="flex items-center gap-2"
      >
        {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
        {isPaused ? 'Resume' : 'Pause'}
      </Button>
      <Button 
        variant="outline" 
        onClick={onStop}
        className="flex items-center gap-2"
      >
        <StopIcon className="h-4 w-4" />
        Stop
      </Button>
      <Button 
        variant="outline" 
        onClick={onNewGame}
        className="flex items-center gap-2"
      >
        <RefreshCwIcon className="h-4 w-4" />
        New Game
      </Button>
    </div>
  );
}
