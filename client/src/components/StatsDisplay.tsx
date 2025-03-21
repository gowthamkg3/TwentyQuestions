import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiRequest } from '@lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon, TrophyIcon, ClockIcon, BrainIcon } from 'lucide-react';

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  averageQuestions: number;
  bestScore: number;
  byCategory: {
    [key: string]: { played: number; won: number };
  };
  byDifficulty: {
    [key: string]: { played: number; won: number };
  };
}

interface CurrentGame {
  questionCount: number;
  category: string;
  difficulty: string;
  gameMode: string;
  hintsUsed: number;
  gameTimeInSeconds: number;
  active: boolean;
}

interface StatsResponse {
  currentGame: CurrentGame | null;
  statistics: GameStats;
}

export function StatsDisplay() {
  const { data, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
          <CardDescription>Loading your game stats...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 w-full max-w-md bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Game Statistics</CardTitle>
          <CardDescription>Could not load statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            There was an error loading your game statistics. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { statistics, currentGame } = data;

  // Prepare data for charts
  const categoryData = Object.entries(statistics.byCategory).map(([category, stats]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    played: stats.played,
    won: stats.won,
    winRate: stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  }));

  const difficultyData = Object.entries(statistics.byDifficulty).map(([difficulty, stats]) => ({
    name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    played: stats.played,
    won: stats.won,
    winRate: stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  }));

  const winRateData = [
    { name: 'Won', value: statistics.gamesWon, color: '#10b981' },
    { name: 'Lost', value: statistics.gamesPlayed - statistics.gamesWon, color: '#ef4444' }
  ];

  const winRate = statistics.gamesPlayed > 0 
    ? Math.round((statistics.gamesWon / statistics.gamesPlayed) * 100) 
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Game Statistics</span>
          {currentGame && currentGame.active && (
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
              Game in Progress
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Tracking your 20 Questions performance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-gray-500 text-sm mb-1">Games</div>
            <div className="text-2xl font-bold">{statistics.gamesPlayed}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-gray-500 text-sm mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-primary">{winRate}%</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-gray-500 text-sm mb-1">Avg. Questions</div>
            <div className="text-2xl font-bold">{statistics.averageQuestions}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-gray-500 text-sm mb-1">Best Score</div>
            <div className="text-2xl font-bold text-indigo-600">{statistics.bestScore}</div>
          </div>
        </div>

        <Separator />

        {/* Current Game */}
        {currentGame && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-blue-800 font-semibold mb-2 flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Current Game
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>{' '}
                <Badge variant="secondary" className="capitalize">{currentGame.category}</Badge>
              </div>
              <div>
                <span className="text-gray-500">Difficulty:</span>{' '}
                <Badge variant="secondary" className="capitalize">{currentGame.difficulty}</Badge>
              </div>
              <div>
                <span className="text-gray-500">Questions:</span>{' '}
                <span className="font-semibold">{currentGame.questionCount} / 20</span>
              </div>
              <div>
                <span className="text-gray-500">Hints Used:</span>{' '}
                <span className="font-semibold">{currentGame.hintsUsed}</span>
              </div>
              <div>
                <span className="text-gray-500">Mode:</span>{' '}
                <Badge variant="outline" className="uppercase">{currentGame.gameMode}</Badge>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>{' '}
                <span className="font-semibold">
                  {Math.floor(currentGame.gameTimeInSeconds / 60)}m {currentGame.gameTimeInSeconds % 60}s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Stats */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mx-1">
                {statistics.gamesWon} Wins
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mx-1">
                {statistics.gamesPlayed - statistics.gamesWon} Losses
              </Badge>
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="played" fill="#6366f1" name="Games Played" />
                  <Bar dataKey="won" fill="#10b981" name="Games Won" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="difficulty" className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={difficultyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="played" fill="#6366f1" name="Games Played" />
                  <Bar dataKey="won" fill="#10b981" name="Games Won" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {difficultyData.map(item => (
                <div key={item.name} className="text-center">
                  <Badge className="mb-1 capitalize">{item.name}</Badge>
                  <div className="text-sm">
                    Win Rate: <span className="font-semibold">{item.winRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}