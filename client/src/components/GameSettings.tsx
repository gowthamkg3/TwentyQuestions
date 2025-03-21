import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GameMode, Difficulty, WordCategory, GameSettings } from '@lib/types';

interface GameSettingsProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onClose: () => void;
  onStartGame: () => void;
}

export function GameSettingsPanel({ settings, onSettingsChange, onClose, onStartGame }: GameSettingsProps) {
  const [localSettings, setLocalSettings] = React.useState<GameSettings>(settings);
  
  const handleGameModeChange = (value: GameMode) => {
    setLocalSettings(prev => ({ ...prev, gameMode: value }));
  };
  
  const handleDifficultyChange = (value: Difficulty) => {
    setLocalSettings(prev => ({ ...prev, difficulty: value }));
  };
  
  const handleCategoryToggle = (category: WordCategory) => {
    setLocalSettings(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      
      // Ensure at least one category is selected
      return {
        ...prev,
        categories: newCategories.length > 0 ? newCategories : [category]
      };
    });
  };
  
  const handleHintsToggle = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, showHints: checked }));
  };
  
  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };
  
  const handleStartGame = () => {
    onSettingsChange(localSettings);
    onStartGame();
  };
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-poppins text-primary">Game Settings</CardTitle>
        <CardDescription>
          Configure your game preferences before starting
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Game Mode Selection */}
        <div className="space-y-3">
          <Label htmlFor="gameMode" className="text-md font-semibold">Game Mode</Label>
          <Select value={localSettings.gameMode} onValueChange={handleGameModeChange}>
            <SelectTrigger id="gameMode" className="w-full">
              <SelectValue placeholder="Select game mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v1">V1: You Ask, LLM Answers</SelectItem>
              <SelectItem value="v2">V2: LLM Asks, LLM Answers (You Watch)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {localSettings.gameMode === "v1"
              ? "Classic mode where you ask questions and the AI answers."
              : "Watch as one AI tries to guess what another AI is thinking!"}
          </p>
        </div>
        
        <Separator />
        
        {/* Difficulty Selection */}
        <div className="space-y-3">
          <Label htmlFor="difficulty" className="text-md font-semibold">Difficulty Level</Label>
          <Select value={localSettings.difficulty} onValueChange={handleDifficultyChange}>
            <SelectTrigger id="difficulty" className="w-full">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {localSettings.difficulty === "easy" && "Common, everyday items that are easy to guess."}
            {localSettings.difficulty === "medium" && "Moderately challenging items that require good questions."}
            {localSettings.difficulty === "hard" && "Difficult items that will test your questioning strategy."}
          </p>
        </div>
        
        <Separator />
        
        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-md font-semibold">Word Categories</Label>
          <div className="flex flex-wrap gap-2">
            {(["animal", "place", "object", "food", "person", "concept"] as WordCategory[]).map(category => (
              <Badge
                key={category}
                variant={localSettings.categories.includes(category) ? "default" : "outline"}
                className={`cursor-pointer py-1 px-3 capitalize ${
                  localSettings.categories.includes(category) 
                    ? "bg-primary hover:bg-primary/80" 
                    : "hover:bg-gray-200"
                }`}
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Select at least one category of words to include in the game.
          </p>
        </div>
        
        <Separator />
        
        {/* Hints Toggle */}
        <div className="flex items-center justify-between space-x-2">
          <div>
            <Label htmlFor="hints" className="text-md font-semibold">Show Hints</Label>
            <p className="text-sm text-gray-500">Enable hints for challenging words</p>
          </div>
          <Switch 
            id="hints" 
            checked={localSettings.showHints}
            onCheckedChange={handleHintsToggle}
          />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <div className="space-x-2">
          <Button variant="secondary" onClick={handleSave}>Save Settings</Button>
          <Button variant="default" onClick={handleStartGame}>Start Game</Button>
        </div>
      </CardFooter>
    </Card>
  );
}