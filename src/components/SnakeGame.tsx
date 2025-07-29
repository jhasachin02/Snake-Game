import React, { useState, useEffect, useCallback, useRef } from 'react';
// Helper for detecting touch swipe direction
function useSwipe(onSwipe: (dir: { x: number; y: number }) => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    }
    function handleTouchEnd(e: TouchEvent) {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
          onSwipe(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
        } else {
          onSwipe(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
        }
      }
      touchStart.current = null;
    }
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe]);
}
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: Position;
  score: number;
  isPlaying: boolean;
  isGameOver: boolean;
  speed: number;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_DIRECTION = { x: 1, y: 0 };
const INITIAL_SPEED = 150;

const SnakeGame: React.FC = () => {
  // Handle swipe gestures for mobile
  useSwipe((swipeDir) => {
    if (!gameState.isPlaying) return;
    const prev = directionRef.current;
    // Prevent reverse
    if (
      (swipeDir.x === 0 && prev.y === 0) ||
      (swipeDir.y === 0 && prev.x === 0)
    ) return;
    if (
      (swipeDir.x === 1 && prev.x === -1) ||
      (swipeDir.x === -1 && prev.x === 1) ||
      (swipeDir.y === 1 && prev.y === -1) ||
      (swipeDir.y === -1 && prev.y === 1)
    ) return;
    directionRef.current = swipeDir;
  });
  const [gameState, setGameState] = useState<GameState>({
    snake: INITIAL_SNAKE,
    food: INITIAL_FOOD,
    direction: INITIAL_DIRECTION,
    score: 0,
    isPlaying: false,
    isGameOver: false,
    speed: INITIAL_SPEED,
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const gameLoopRef = useRef<NodeJS.Timeout>();
  const directionRef = useRef(INITIAL_DIRECTION);

  const generateFood = useCallback((snake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const newFood = generateFood(INITIAL_SNAKE);
    setGameState({
      snake: INITIAL_SNAKE,
      food: newFood,
      direction: INITIAL_DIRECTION,
      score: 0,
      isPlaying: false,
      isGameOver: false,
      speed: INITIAL_SPEED,
    });
    directionRef.current = INITIAL_DIRECTION;
  }, [generateFood]);

  const toggleGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const moveSnake = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying || prev.isGameOver) return prev;

      const newSnake = [...prev.snake];
      const head = { ...newSnake[0] };
      const direction = directionRef.current;

      head.x += direction.x;
      head.y += direction.y;

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        return { ...prev, isPlaying: false, isGameOver: true };
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return { ...prev, isPlaying: false, isGameOver: true };
      }

      newSnake.unshift(head);

      // Check food collision
      let newFood = prev.food;
      let newScore = prev.score;
      let newSpeed = prev.speed;

      if (head.x === prev.food.x && head.y === prev.food.y) {
        newFood = generateFood(newSnake);
        newScore += 10;
        newSpeed = Math.max(50, prev.speed - 2); // Increase speed, minimum 50ms
      } else {
        newSnake.pop();
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        score: newScore,
        speed: newSpeed,
      };
    });
  }, [generateFood]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!gameState.isPlaying) return;

    const { key } = e;
    const direction = directionRef.current;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (direction.y === 0) directionRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (direction.y === 0) directionRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (direction.x === 0) directionRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (direction.x === 0) directionRef.current = { x: 1, y: 0 };
        break;
      case ' ':
        e.preventDefault();
        toggleGame();
        break;
    }
  }, [gameState.isPlaying, toggleGame]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (gameState.isPlaying) {
      gameLoopRef.current = setInterval(moveSnake, gameState.speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.speed, moveSnake]);

  useEffect(() => {
    if (gameState.isGameOver && gameState.score > highScore) {
      setHighScore(gameState.score);
      localStorage.setItem('snakeHighScore', gameState.score.toString());
    }
  }, [gameState.isGameOver, gameState.score, highScore]);

  const getCellClass = (x: number, y: number): string => {
    const isSnakeHead = gameState.snake[0]?.x === x && gameState.snake[0]?.y === y;
    const isSnakeBody = gameState.snake.slice(1).some(segment => segment.x === x && segment.y === y);
    const isFood = gameState.food.x === x && gameState.food.y === y;

    let baseClass = 'w-4 h-4 border border-gray-800 transition-all duration-100';

    if (isSnakeHead) {
      return `${baseClass} bg-emerald-400 shadow-lg scale-110 rounded-sm`;
    } else if (isSnakeBody) {
      return `${baseClass} bg-emerald-500 rounded-sm`;
    } else if (isFood) {
      return `${baseClass} bg-orange-500 shadow-lg scale-110 rounded-full animate-pulse`;
    }

    return `${baseClass} bg-gray-900`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-xl">
              <div className="w-6 h-6 bg-emerald-400 rounded-sm"></div>
            </div>
            <h1 className="text-3xl font-bold text-white">Snake Game</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-400">Score</p>
              <p className="text-2xl font-bold text-white">{gameState.score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Best
              </p>
              <p className="text-2xl font-bold text-orange-400">{highScore}</p>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="bg-gray-800 p-4 rounded-xl shadow-inner">
            <div 
              className="grid gap-0 mx-auto"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: 'fit-content'
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
                const x = index % GRID_SIZE;
                const y = Math.floor(index / GRID_SIZE);
                return (
                  <div
                    key={`${x}-${y}`}
                    className={getCellClass(x, y)}
                  />
                );
              })}
            </div>
          </div>

        {/* Controls */}
        {/* On-screen arrow controls for mobile */}
        <div className="flex flex-col items-center gap-2 mt-4 sm:flex md:flex lg:hidden">
          <div className="flex justify-center gap-8 md:gap-12">
            <button aria-label="Up" className="bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full p-4 md:p-6 shadow-lg border-2 border-emerald-700 active:scale-95 transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-emerald-400/50" onClick={() => { if (directionRef.current.y === 0) directionRef.current = { x: 0, y: -1 }; }}>
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2"><path d="M16 27V5M5 16l11-11 11 11"/></svg>
            </button>
          </div>
          <div className="flex justify-center gap-8 md:gap-12">
            <button aria-label="Left" className="bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full p-4 md:p-6 shadow-lg border-2 border-emerald-700 active:scale-95 transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-emerald-400/50" onClick={() => { if (directionRef.current.x === 0) directionRef.current = { x: -1, y: 0 }; }}>
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2"><path d="M27 16H5M16 27l-11-11 11-11"/></svg>
            </button>
            <button aria-label="Down" className="bg-gradient-to-t from-emerald-400 to-emerald-600 rounded-full p-4 md:p-6 shadow-lg border-2 border-emerald-700 active:scale-95 transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-emerald-400/50" onClick={() => { if (directionRef.current.y === 0) directionRef.current = { x: 0, y: 1 }; }}>
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2"><path d="M16 5v22M5 16l11 11 11-11"/></svg>
            </button>
            <button aria-label="Right" className="bg-gradient-to-l from-emerald-400 to-emerald-600 rounded-full p-4 md:p-6 shadow-lg border-2 border-emerald-700 active:scale-95 transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-emerald-400/50" onClick={() => { if (directionRef.current.x === 0) directionRef.current = { x: 1, y: 0 }; }}>
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2"><path d="M5 16h22M16 5l11 11-11 11"/></svg>
            </button>
          </div>
        </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-6">
              {/* Game Controls */}
              <div className="bg-gray-800 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Controls</h3>
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={toggleGame}
                    disabled={gameState.isGameOver}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {gameState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {gameState.isPlaying ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={resetGame}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-sm text-gray-300">
                  <p className="font-medium text-white">How to Play:</p>
                  <ul className="space-y-1">
                    <li>• Use arrow keys or WASD to move</li>
                    <li>• Eat orange food to grow and score</li>
                    <li>• Avoid hitting walls or yourself</li>
                    <li>• Press Space to pause/resume</li>
                  </ul>
                </div>
              </div>

              {/* Game Stats */}
              <div className="bg-gray-800 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Length:</span>
                    <span className="text-white font-medium">{gameState.snake.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Speed:</span>
                    <span className="text-white font-medium">
                      {Math.round((200 - gameState.speed) / 15) * 10}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-medium ${
                      gameState.isGameOver ? 'text-red-400' : 
                      gameState.isPlaying ? 'text-emerald-400' : 'text-orange-400'
                    }`}>
                      {gameState.isGameOver ? 'Game Over' : 
                       gameState.isPlaying ? 'Playing' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Over Modal */}
        {gameState.isGameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-gray-700">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💀</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                <p className="text-gray-400">Better luck next time</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Final Score:</span>
                  <span className="text-xl font-bold text-white">{gameState.score}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Snake Length:</span>
                  <span className="text-white font-medium">{gameState.snake.length}</span>
                </div>
                {gameState.score === highScore && (
                  <div className="mt-3 p-2 bg-orange-500 bg-opacity-20 rounded-lg">
                    <span className="text-orange-400 font-medium">🎉 New High Score!</span>
                  </div>
                )}
              </div>

              <button
                onClick={resetGame}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;