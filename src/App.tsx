import { useState, useCallback, useRef, useEffect } from 'react';
import { FlagBattle } from './components/FlagBattle';
import { GameUI } from './components/GameUI';
import { getFlagUrl, getCountryName } from './utils/flags';
import winnerAudio from './assets/winner.mp3';

function App() {
  const [alive, setAlive] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [tab, setTab] = useState<'LEADERBOARD' | 'SETTINGS'>('LEADERBOARD');
  const [gameKey, setGameKey] = useState(Date.now()); // to force remount game loop
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio unlock hack for mobile browsers
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Track total wins globally across cycles
  const leaderboardRef = useRef<Record<string, number>>({});
  const [, forceRender] = useState({}); // trigger render for leaderboard updates

  const handleUpdateStats = useCallback((currentAlive: number, leaderboardDeltas: Record<string, number>, totalAtStart?: number) => {
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
      setWinner(null);
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
      
      const utterance = new SpeechSynthesisUtterance(`${getCountryName(winnerCode)} wins!`);
      
      const voices = window.speechSynthesis.getVoices();
      // Try to select a common female voice identifier by name
      const femaleVoice = voices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Woman') || 
        v.name.includes('Samantha') || // macOS/iOS female voice
        v.name.includes('Victoria') || // macOS alternative
        v.name.includes('Zira') ||     // Windows female voice
        v.name.includes('Google UK English Female') || // Chrome
        v.name.includes('Google US English') // Chrome Android often defaults to female
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }

    setWinner(winnerCode || null);
    setCountdown(5);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
    }
  }, [cycle, countdown]);

  const handleStop = () => {
    // Reset Everything
    setCycle(1);
    leaderboardRef.current = {};
    setIsPaused(false);
    setCountdown(null);
    setWinner(null);
    setGameKey(Date.now());
  };

  const handleApplySettings = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
    setCycle(1);
    leaderboardRef.current = {};
    setIsPaused(false);
    setCountdown(null);
    setWinner(null);
    setGameKey(Date.now());
  }, []);

  const leaderboardArray = Object.entries(leaderboardRef.current).map(([code, wins]) => ({
    countryCode: code,
    wins
  }));

  return (
    <div className="app-container">
      <audio ref={audioRef} src={winnerAudio} preload="auto" />
      <button
        className="settings-toggle-btn"
        onClick={() => setTab(t => t === 'SETTINGS' ? 'LEADERBOARD' : 'SETTINGS')}
      >
        ⚙️
      </button>

      {/* Top Right UI Overlay */}
      <div className="ui-layer absolute-right">
        <GameUI
          leaderboard={leaderboardArray}
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
          {winner && (
            <div className="winner-display">
              <img src={getFlagUrl(winner)} alt={winner} className="winner-flag" />
              <h2 className="winner-name">{getCountryName(winner)} Wins!</h2>
            </div>
          )}
          <p>Next round starts in {countdown}...</p>
        </div>
      )}
    </div>
  );
}

export default App;
