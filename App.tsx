import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './components/Scene';
import GameUI from './components/GameUI';
import { GameState, Recording } from './types';
import { useSounds } from './hooks/useSounds';
import { getLevelConfig, MAX_LEVELS } from './levelConfig';

type GameMode = 'start' | 'single' | 'challenge';

interface SaveData {
  gameMode: GameMode;
  level: number;
  p1Score: number;
  p1Lives: number;
  p1StarCoins: number;
  p1PipesPassed: number;
  p1CanScore: boolean;
  p2Score?: number;
  p2Lives?: number;
  p2StarCoins?: number;
  p2PipesPassed?: number;
  p2CanScore?: boolean;
}

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('start');
  const [level, setLevel] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastRecording, setLastRecording] = useState<Recording | null>(null);
  const [saveData, setSaveData] = useState<SaveData | null>(null);

  // Player 1 State
  const [p1GameState, setP1GameState] = useState<GameState>('start');
  const [p1Score, setP1Score] = useState(0);
  const [p1Lives, setP1Lives] = useState(6);
  const [p1StarCoins, setP1StarCoins] = useState(0);
  const [p1PipesPassed, setP1PipesPassed] = useState(0);
  const [p1CanScore, setP1CanScore] = useState(true);

  // Player 2 State
  const [p2GameState, setP2GameState] = useState<GameState>('start');
  const [p2Score, setP2Score] = useState(0);
  const [p2Lives, setP2Lives] = useState(6);
  const [p2StarCoins, setP2StarCoins] = useState(0);
  const [p2PipesPassed, setP2PipesPassed] = useState(0);
  const [p2CanScore, setP2CanScore] = useState(true);

  const { playSound, playMusic, stopMusic } = useSounds({ isMuted });
  
  const p1FlapRef = useRef<() => void>(() => {});
  const p2FlapRef = useRef<() => void>(() => {});
  const recordingRef = useRef<{ level: number; startTime: number; flaps: { time: number }[] } | null>(null);

  // Load game data on mount
  useEffect(() => {
    try {
      const savedGame = localStorage.getItem('ufoFlapSaveData');
      if (savedGame) {
        setSaveData(JSON.parse(savedGame));
      }
    } catch (error) {
      console.error("Failed to load game data:", error);
      setSaveData(null);
    }
  }, []);

  const clearSaveData = useCallback(() => {
    try {
        localStorage.removeItem('ufoFlapSaveData');
        setSaveData(null);
    } catch (error) {
        console.error("Failed to clear save data:", error);
    }
  }, []);

  const resetPlayerData = (setScore: Function, setLives: Function, setStarCoins: Function, setPipesPassed: Function, setGameState: Function, setCanScore?: Function) => {
    setScore(0);
    setLives(6);
    setStarCoins(0);
    setPipesPassed(0);
    setGameState('ready');
    if (setCanScore) setCanScore(true);
  };

  const handleStart = useCallback((mode: GameMode, startLevel = 1) => {
    if (isStarting || mode === 'start') return;
    clearSaveData(); // Clear old save when starting a new game
    setIsStarting(true);
    setTimeout(() => {
        setGameMode(mode);
        setLevel(startLevel);
        resetPlayerData(setP1Score, setP1Lives, setP1StarCoins, setP1PipesPassed, setP1GameState, setP1CanScore);
        if (mode === 'challenge') {
            resetPlayerData(setP2Score, setP2Lives, setP2StarCoins, setP2PipesPassed, setP2GameState, setP2CanScore);
        }
        setIsStarting(false);
    }, 500);
  }, [isStarting, clearSaveData]);

  const handleRestart = useCallback(() => {
    clearSaveData();
    stopMusic();
    setGameMode('start');
    setP1GameState('start');
    setP2GameState('start');
    // FIX: Reset isStarting flag to allow immediate restart after game over.
    setIsStarting(false);
  }, [clearSaveData, stopMusic]);
  
  const handleSaveGame = useCallback(() => {
    // Only save if a game is actively in progress or paused
    if (gameMode === 'start' || (p1GameState !== 'playing' && p1GameState !== 'paused')) return;

    const dataToSave: SaveData = {
      gameMode,
      level,
      p1Score,
      p1Lives,
      p1StarCoins,
      p1PipesPassed,
      p1CanScore,
      p2Score: gameMode === 'challenge' ? p2Score : undefined,
      p2Lives: gameMode === 'challenge' ? p2Lives : undefined,
      p2StarCoins: gameMode === 'challenge' ? p2StarCoins : undefined,
      p2PipesPassed: gameMode === 'challenge' ? p2PipesPassed : undefined,
      p2CanScore: gameMode === 'challenge' ? p2CanScore : undefined,
    };
    try {
        localStorage.setItem('ufoFlapSaveData', JSON.stringify(dataToSave));
        setSaveData(dataToSave);
    } catch (error) {
        console.error("Failed to save game data:", error);
    }
  }, [gameMode, level, p1Score, p1Lives, p1StarCoins, p1PipesPassed, p1CanScore, p2Score, p2Lives, p2StarCoins, p2PipesPassed, p2CanScore, p1GameState]);

  const handleLoadGame = useCallback(() => {
    try {
        const savedGame = localStorage.getItem('ufoFlapSaveData');
        if (savedGame) {
            const data: SaveData = JSON.parse(savedGame);
            setGameMode(data.gameMode);
            setLevel(data.level);
            setP1Score(data.p1Score);
            setP1Lives(data.p1Lives);
            setP1StarCoins(data.p1StarCoins);
            setP1PipesPassed(data.p1PipesPassed);
            setP1CanScore(data.p1CanScore);
            setP1GameState('ready'); // Start in ready state

            if (data.gameMode === 'challenge') {
                setP2Score(data.p2Score ?? 0);
                setP2Lives(data.p2Lives ?? 6);
                setP2StarCoins(data.p2StarCoins ?? 0);
                setP2PipesPassed(data.p2PipesPassed ?? 0);
                setP2CanScore(data.p2CanScore ?? true);
                setP2GameState('ready');
            }
        }
    } catch (error) {
        console.error("Failed to load game data:", error);
        clearSaveData();
    }
  }, [clearSaveData]);

  const handleQuitToMenu = useCallback(() => {
    handleSaveGame();
    stopMusic();
    setGameMode('start');
    setP1GameState('start');
    setP2GameState('start');
  }, [handleSaveGame, stopMusic]);

  const handleExit = () => {
    handleSaveGame();
    window.close();
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  const handlePause = useCallback(() => {
    playSound('pause');
    if (gameMode === 'single') {
        setP1GameState(prev => prev === 'playing' ? 'paused' : 'playing');
    } else if (gameMode === 'challenge') {
        const anyPlaying = p1GameState === 'playing' || p2GameState === 'playing';
        if(anyPlaying) {
          // Pause both if either is playing
          if (p1GameState === 'playing') setP1GameState('paused');
          if (p2GameState === 'playing') setP2GameState('paused');
        } else {
          // Resume both if either is paused
          if (p1GameState === 'paused') setP1GameState('playing');
          if (p2GameState === 'paused') setP2GameState('playing');
        }
    }
  }, [gameMode, p1GameState, p2GameState, playSound]);

  const handleResumeFromLevel = useCallback(() => {
    // Logic to resume the current level after game over
    setP1GameState('ready');
    setP1Lives(3); // Give some lives back
    // Keep score, but reset pipes passed for the level
    setP1PipesPassed(0);
  }, []);

  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    if (nextLevel > MAX_LEVELS) {
      setP1GameState('victory');
      if (gameMode === 'challenge') setP2GameState('victory');
      stopMusic();
      clearSaveData();
    } else {
      setLevel(nextLevel);
      
      const config = getLevelConfig(nextLevel);
      const levelComplete = (pipesPassed: number) => pipesPassed >= config.pipeCount && config.pipeCount > 0;
      
      if(p1GameState !== 'gameOver') {
          setP1GameState('ready');
          setP1PipesPassed(0);
          if(levelComplete(p1PipesPassed)) setP1GameState('levelComplete');
      }
      if(gameMode === 'challenge' && p2GameState !== 'gameOver') {
          setP2GameState('ready');
          setP2PipesPassed(0);
          if(levelComplete(p2PipesPassed)) setP2GameState('levelComplete');
      }
    }
  }, [level, gameMode, stopMusic, clearSaveData, p1GameState, p2GameState, p1PipesPassed, p2PipesPassed]);

  const handleFlap = useCallback(() => {
    if (p1GameState === 'ready' || (gameMode === 'challenge' && p2GameState === 'ready')) {
      setP1GameState('playing');
      if(gameMode === 'challenge') setP2GameState('playing');
      recordingRef.current = { level, startTime: Date.now(), flaps: [] };
    }
    if (recordingRef.current && p1GameState === 'playing') {
      recordingRef.current.flaps.push({ time: Date.now() - recordingRef.current.startTime });
    }
    playSound('flap');
  }, [p1GameState, p2GameState, gameMode, level, playSound]);

  const createCrashHandler = (
      setLives: React.Dispatch<React.SetStateAction<number>>,
      setGameState: React.Dispatch<React.SetStateAction<GameState>>,
      canScore: boolean
    ) => () => {
      if (!canScore) return; // Ghost player can't crash again
      playSound('crash');
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
        }
        return newLives;
      });
  };

  const handleCrash1 = createCrashHandler(setP1Lives, setP1GameState, p1CanScore);
  const handleCrash2 = createCrashHandler(setP2Lives, setP2GameState, p2CanScore);
  
  const createPipePassHandler = (
    setScore: React.Dispatch<React.SetStateAction<number>>,
    setPipesPassed: React.Dispatch<React.SetStateAction<number>>,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canScore: boolean
  ) => () => {
    if (!canScore) return;
    playSound('score');
    setScore(prev => prev + 100);
    setPipesPassed(prev => {
        const newCount = prev + 1;
        const config = getLevelConfig(level);
        if (config.pipeCount > 0 && newCount >= config.pipeCount) {
            setGameState('levelComplete');
            playSound('levelComplete');
            setLastRecording(recordingRef.current);
        }
        return newCount;
    });
  };

  const handlePipePass1 = createPipePassHandler(setP1Score, setP1PipesPassed, setP1GameState, p1CanScore);
  const handlePipePass2 = createPipePassHandler(setP2Score, setP2PipesPassed, setP2GameState, p2CanScore);

  const createCoinCollectHandler = (
      setScore: React.Dispatch<React.SetStateAction<number>>,
      setStarCoins: React.Dispatch<React.SetStateAction<number>>,
      setLives: React.Dispatch<React.SetStateAction<number>>,
      canScore: boolean
    ) => () => {
      if (!canScore) return;
      playSound('coin');
      setScore(prev => prev + 25);
      setStarCoins(prev => {
        const newCoins = prev + 1;
        if (newCoins >= 25) {
          setLives(l => l + 1);
          playSound('lifeUp');
          return 0;
        }
        return newCoins;
      });
  };
  
  const handleCoinCollect1 = createCoinCollectHandler(setP1Score, setP1StarCoins, setP1Lives, p1CanScore);
  const handleCoinCollect2 = createCoinCollectHandler(setP2Score, setP2StarCoins, setP2Lives, p2CanScore);
  
  const createTrapHitHandler = (
      setLives: React.Dispatch<React.SetStateAction<number>>,
      setGameState: React.Dispatch<React.SetStateAction<GameState>>,
      canScore: boolean
    ) => () => {
      if (!canScore) return;
      playSound('trap');
      setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
              setGameState('gameOver');
          }
          return newLives;
      });
  };

  const handleTrapHit1 = createTrapHitHandler(setP1Lives, setP1GameState, p1CanScore);
  const handleTrapHit2 = createTrapHitHandler(setP2Lives, setP2GameState, p2CanScore);

  // Challenge mode specific logic
  useEffect(() => {
    if (gameMode === 'challenge') {
        if (p1Lives <= 0 && p1CanScore) {
            setP1CanScore(false);
        }
        if (p2Lives <= 0 && p2CanScore) {
            setP2CanScore(false);
        }

        const p1LevelComplete = p1GameState === 'levelComplete';
        const p2LevelComplete = p2GameState === 'levelComplete';
        const p1GameOver = p1GameState === 'gameOver';
        const p2GameOver = p2GameState === 'gameOver';

        // If one player completes the level, the other one also advances (if not game over)
        if (p1LevelComplete && !p2GameOver) setP2GameState('levelComplete');
        if (p2LevelComplete && !p1GameOver) setP1GameState('levelComplete');
        
        // If one player completes the level, revive the other one for the next level
        if ((p1LevelComplete || p2LevelComplete) && (p1GameOver || p2GameOver)) {
          if (p1GameOver) {
            setP1Lives(1); // Revive with 1 life
            setP1GameState('levelComplete'); // So they advance
          }
           if (p2GameOver) {
            setP2Lives(1);
            setP2GameState('levelComplete');
          }
        }
    }
  }, [p1Lives, p2Lives, gameMode, p1CanScore, p2CanScore, p1GameState, p2GameState]);


  const handlePointerDown = useCallback((event: Event) => {
    // Prevent flap if a UI button was clicked
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
        return;
    }
    
    if (gameMode === 'single') {
        p1FlapRef.current();
    } else if (gameMode === 'challenge') {
        p2FlapRef.current();
    }
  }, [gameMode]);
  
  // Keyboard and Pointer Listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        p1FlapRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Add pointer down listener to the window for mobile taps
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [handlePointerDown]);

  // Music playback
  useEffect(() => {
    const isPlaying = p1GameState === 'playing' || p2GameState === 'playing';
    const isReady = p1GameState === 'ready' || p2GameState === 'ready';

    if (isPlaying || isReady) {
        playMusic(level);
    } else {
        stopMusic();
    }
    // Cleanup on unmount
    return () => stopMusic();
  }, [p1GameState, p2GameState, level, playMusic, stopMusic]);

  return (
    <>
      <div id="canvas-container">
        <Canvas shadows>
          <Scene
            gameMode={gameMode}
            level={level}
            onFlap={handleFlap}
            lastRecording={lastRecording}
            p1GameState={p1GameState}
            onPipePass1={handlePipePass1}
            onCoinCollect1={handleCoinCollect1}
            onTrapHit1={handleTrapHit1}
            onCrash1={handleCrash1}
            p1FlapRef={p1FlapRef}
            p2GameState={p2GameState}
            onPipePass2={handlePipePass2}
            onCoinCollect2={handleCoinCollect2}
            onTrapHit2={handleTrapHit2}
            onCrash2={handleCrash2}
            p2FlapRef={p2FlapRef}
          />
        </Canvas>
      </div>
      <GameUI
        gameMode={gameMode}
        level={level}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isStarting={isStarting}
        onStart={handleStart}
        onRestart={handleRestart}
        onResume={handleResumeFromLevel}
        onNextLevel={handleNextLevel}
        onPause={handlePause}
        playSound={playSound}
        onExit={handleExit}
        onQuitToMenu={handleQuitToMenu}
        onLoadGame={handleLoadGame}
        saveData={saveData}
        p1Score={p1Score}
        p1Lives={p1Lives}
        p1StarCoins={p1StarCoins}
        p1GameState={p1GameState}
        p2Score={p2Score}
        p2Lives={p2Lives}
        p2StarCoins={p2StarCoins}
        p2GameState={p2GameState}
      />
    </>
  );
};

export default App;
