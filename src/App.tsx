import { useState, useCallback, useRef, useEffect } from 'react';
import { FlagBattle } from './components/FlagBattle';
import { GameUI } from './components/GameUI';

function App() {
  const [alive, setAlive] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [tab, setTab] = useState<'STATS' | 'LEADERBOARD' | 'SETTINGS'>('LEADERBOARD');
  const [gameKey, setGameKey] = useState(Date.now()); // to force remount game loop
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  
  // Track total wins globally across cycles
  const leaderboardRef = useRef<Record<string, number>>({});
  const [, forceRender] = useState({}); // trigger render for leaderboard updates

  const handleUpdateStats = useCallback((currentAlive: number, leaderboardDeltas: Record<string, number>) => {
    setAlive(currentAlive);
    
    let updated = false;
    for (const [code, wins] of Object.entries(leaderboardDeltas)) {
      if (!leaderboardRef.current[code]) leaderboardRef.current[code] = 0;
      leaderboardRef.current[code] += wins;
      updated = true;
    }
    
    if (updated) {
      forceRender({});
    }
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCycle(c => c + 1);
      setGameKey(Date.now());
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGameOver = useCallback((winnerCode: string) => {
    if (countdown !== null) return;
    console.log(`Cycle ${cycle} Winner: ${winnerCode.toUpperCase()}`);
    
    if (winnerCode) {
      if (!leaderboardRef.current[winnerCode]) leaderboardRef.current[winnerCode] = 0;
      leaderboardRef.current[winnerCode] += 1;
      forceRender({});
    }
    
    setCountdown(5);
  }, [cycle, countdown]);

  const handleStop = () => {
    // Reset Everything
    setCycle(1);
    setAlive(0);
    leaderboardRef.current = {};
    setIsPaused(false);
    setCountdown(null);
    setGameKey(Date.now());
  };

  const handleApplySettings = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
    setCycle(1);
    setAlive(0);
    leaderboardRef.current = {};
    setIsPaused(false);
    setCountdown(null);
    setGameKey(Date.now());
  }, []);

  const leaderboardArray = Object.entries(leaderboardRef.current).map(([code, wins]) => ({
    countryCode: code,
    wins
  }));

  return (
    <div className="app-container">
      {/* UI Overlay */}
      <div className="ui-layer">
        <GameUI
          alive={alive}
          cycle={cycle}
          leaderboard={leaderboardArray}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(p => !p)}
          onStop={handleStop}
          tab={tab}
          setTab={setTab}
          selectedCountries={selectedCountries}
          onApplySettings={handleApplySettings}
        />
      </div>

      {/* Game Canvas */}
      <div className="game-layer">
        <FlagBattle
          key={gameKey} // uniquely remount the canvas on reset/cycle refresh
          onGameOver={handleGameOver}
          onUpdateStats={handleUpdateStats}
          isPaused={isPaused}
          selectedCountries={selectedCountries}
        />
      </div>

      {countdown !== null && (
        <div className="countdown-overlay">
          <h1>Round Over!</h1>
          <p>Next round starts in {countdown}...</p>
        </div>
      )}
    </div>
  );
}

export default App;
