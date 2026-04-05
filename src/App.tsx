import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { FlagBattle } from './components/FlagBattle';
import { FlagCollider } from './components/FlagCollider';
import { GameUI } from './components/GameUI';
import { getFlagUrl, getCountryName, COUNTRY_CODES, POPULAR_15_COUNTRIES } from './utils/flags';
import winnerAudio from './assets/winner.mp3';
import poopingAudio from './assets/pooping.mp3';
import agent1Video from './assets/agent1.mp4';


function Home() {
  const navigate = useNavigate();
  return (
    <div className="home-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: '#0b0f19', color: '#fff'
    }}>
      <h1 style={{ fontSize: '48px', color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.8)', marginBottom: '40px' }}>
        Select Game Mode
      </h1>
      <div style={{ display: 'flex', gap: '30px' }}>
        <div 
          onClick={() => navigate('/fall')}
          style={{
            padding: '30px 40px', background: 'rgba(0, 255, 255, 0.1)', border: '2px solid #00ffff',
            borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <h2 style={{ color: '#fff', marginBottom: '10px' }}>Flag Fall</h2>
          <p style={{ color: '#aaa', maxWidth: '200px' }}>Flags compete around an arena with a deadly escape hole.</p>
        </div>
        <div 
          onClick={() => navigate('/collider')}
          style={{
            padding: '30px 40px', background: 'rgba(255, 0, 255, 0.1)', border: '2px solid #ff00ff',
            borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 255, 0.6)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <h2 style={{ color: '#fff', marginBottom: '10px' }}>Flag Collider</h2>
          <p style={{ color: '#aaa', maxWidth: '200px' }}>A closed arena where flags bump to reduce each other's 100 HP.</p>
        </div>
      </div>
    </div>
  );
}

function GameContainer({ initialMode }: { initialMode: 'FALL' | 'COLLIDER' }) {
  const navigate = useNavigate();
  const [alive, setAlive] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [tab, setTab] = useState<'LEADERBOARD' | 'SETTINGS'>('LEADERBOARD');
  const [gameKey, setGameKey] = useState(Date.now());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`selectedCountries_${initialMode}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse cached settings');
    }
    return initialMode === 'COLLIDER' ? POPULAR_15_COUNTRIES : COUNTRY_CODES;
  });
  const [enableDangerCircle, setEnableDangerCircle] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('collider_dangerCircle');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [enableSafeArch, setEnableSafeArch] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('collider_safeArch');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [pointsDeduction, setPointsDeduction] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('collider_pointsDeduction');
      if (saved !== null && !isNaN(Number(saved))) return Number(JSON.parse(saved));
    } catch (e) {}
    return 10;
  });
  const [enableBomb, setEnableBomb] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('collider_enableBomb');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [enableMovingBomb, setEnableMovingBomb] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('collider_enableMovingBomb');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false; // Default to false? Or true? Let's go with false to avoid crowding by default
  });
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'FALL' | 'COLLIDER'>(initialMode);
  const audioRef = useRef<HTMLAudioElement>(null);
  const poopingAudioRef = useRef<HTMLAudioElement>(null);

  // Sync mode changes internally via UI toggles without tearing down the entire app
  useEffect(() => {
    setGameMode(initialMode);
    try {
      const saved = localStorage.getItem(`selectedCountries_${initialMode}`);
      if (saved) {
        setSelectedCountries(JSON.parse(saved));
      } else {
        setSelectedCountries(initialMode === 'COLLIDER' ? POPULAR_15_COUNTRIES : COUNTRY_CODES);
      }
    } catch (e) {
      setSelectedCountries(initialMode === 'COLLIDER' ? POPULAR_15_COUNTRIES : COUNTRY_CODES);
    }
    setGameKey(Date.now());
    setCycle(1);
    leaderboardRef.current = {};
  }, [initialMode]);

  // Survivor spotlight — all driven by refs, zero React effect chain
  const [spotlightCode, setSpotlightCode] = useState<string | null>(null);
  const [displayedName, setDisplayedName] = useState('');
  const typewriterLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const survivorsRef = useRef<string[]>([]);
  const currentCodeRef = useRef<string | null>(null);

  // Track whether audio has been unlocked by a user gesture
  const audioUnlocked = useRef(false);

  // Audio unlock hack — capture phase so game canvas touch events don't swallow it
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlocked.current) return;
      audioUnlocked.current = true;

      // Silently unlock winner audio
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }).catch(() => {});
      }

      // If a round is currently active (no countdown), start pooping audio now
      if (poopingAudioRef.current && countdown === null) {
        poopingAudioRef.current.loop = true;
        poopingAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio, { capture: true });
    document.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', unlockAudio, { capture: true });
      document.removeEventListener('touchstart', unlockAudio, { capture: true });
    };
  }, [countdown]);


  // Track total wins globally across cycles
  const leaderboardRef = useRef<Record<string, number>>({});
  const [, forceRender] = useState({}); // trigger render for leaderboard updates

  const handleUpdateStats = useCallback((currentAlive: number, leaderboardDeltas: Record<string, number>, totalAtStart?: number) => {
    setAlive(currentAlive);
    if (totalAtStart !== undefined) {
      setTotalParticipants(totalAtStart);
    }

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

  // Single self-contained typewriter loop — starts once, never restarted by React
  useEffect(() => {
    const pickAndType = () => {
      const pool = survivorsRef.current;

      if (pool.length === 0) {
        // No survivors yet, check again soon
        setSpotlightCode(null);
        setDisplayedName('');
        typewriterLoopRef.current = setTimeout(pickAndType, 300);
        return;
      }

      // Always pick a DIFFERENT country so the display keeps cycling
      const others = pool.filter(c => c !== currentCodeRef.current);
      const nextPool = others.length > 0 ? others : pool;
      const next = nextPool[Math.floor(Math.random() * nextPool.length)];
      currentCodeRef.current = next;
      setSpotlightCode(next);
      setDisplayedName('');

      const fullName = getCountryName(next);
      let i = 0;

      const typeChar = () => {
        i++;
        setDisplayedName(fullName.slice(0, i));
        if (i < fullName.length) {
          typewriterLoopRef.current = setTimeout(typeChar, 80);
        } else {
          // Done — pause 1s then pick the next country
          typewriterLoopRef.current = setTimeout(pickAndType, 1000);
        }
      };

      typewriterLoopRef.current = setTimeout(typeChar, 80);
    };

    pickAndType();

    return () => {
      if (typewriterLoopRef.current) clearTimeout(typewriterLoopRef.current);
    };
  }, []); // ← empty deps: starts once, self-sustaining forever

  // Update survivor pool — just write to the ref, no state, no re-renders
  const handleSurvivorsUpdate = useCallback((codes: string[]) => {
    survivorsRef.current = codes;
  }, []);

  // Play/stop pooping.mp3 based on whether a round is active
  useEffect(() => {
    if (!poopingAudioRef.current) return;
    if (countdown === null) {
      // Round is active — only play if audio has been unlocked by a user gesture
      if (audioUnlocked.current) {
        poopingAudioRef.current.loop = true;
        poopingAudioRef.current.play().catch(() => {});
      }
    } else {
      // Round ended — stop
      poopingAudioRef.current.pause();
      poopingAudioRef.current.currentTime = 0;
    }
  }, [countdown]);

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

  const handleApplySettings = useCallback((countries: string[], dangerCircle: boolean, safeArch: boolean, deduction: number, bomb: boolean, movingBomb: boolean) => {
    setSelectedCountries(countries);
    localStorage.setItem(`selectedCountries_${gameMode}`, JSON.stringify(countries));
    
    setEnableDangerCircle(dangerCircle);
    localStorage.setItem('collider_dangerCircle', JSON.stringify(dangerCircle));
    
    setEnableSafeArch(safeArch);
    localStorage.setItem('collider_safeArch', JSON.stringify(safeArch));

    setPointsDeduction(deduction);
    localStorage.setItem('collider_pointsDeduction', JSON.stringify(deduction));

    setEnableBomb(bomb);
    localStorage.setItem('collider_enableBomb', JSON.stringify(bomb));

    setEnableMovingBomb(movingBomb);
    localStorage.setItem('collider_enableMovingBomb', JSON.stringify(movingBomb));

    setCycle(1);
    leaderboardRef.current = {};
    setIsPaused(false);
    setCountdown(null);
    setWinner(null);
    setGameKey(Date.now());
  }, [gameMode]);

  const leaderboardArray = Object.entries(leaderboardRef.current).map(([code, wins]) => ({
    countryCode: code,
    wins
  }));

  return (
    <div className="app-container">
      <audio ref={audioRef} src={winnerAudio} preload="auto" />
      <audio ref={poopingAudioRef} src={poopingAudio} preload="auto" />
      
      {/* Home Navigation button */}
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '20px', left: '70px', background: 'transparent',
          border: '2px solid var(--cyan-bright)', color: 'var(--cyan-bright)',
          padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', zIndex: 30,
          fontWeight: 'bold'
        }}
      >
        Home
      </button>

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
          enableDangerCircle={enableDangerCircle}
          enableSafeArch={enableSafeArch}
          pointsDeduction={pointsDeduction}
          enableBomb={enableBomb}
          enableMovingBomb={enableMovingBomb}
          onApplySettings={handleApplySettings}
          cycle={cycle}
          alive={alive}
          totalParticipants={totalParticipants}
          gameMode={gameMode}
          setGameMode={(mode) => {
            if (mode === 'COLLIDER') {
              navigate('/collider');
            } else {
              navigate('/fall');
            }
          }}
        />
      </div>

      {/* Game Canvas */}
      <div className="game-layer">
        {gameMode === 'FALL' ? (
          <FlagBattle
            key={gameKey}
            onGameOver={handleGameOver}
            onUpdateStats={handleUpdateStats}
            onSurvivorsUpdate={handleSurvivorsUpdate}
            isPaused={isPaused}
            selectedCountries={selectedCountries}
          />
        ) : (
          <FlagCollider
            key={gameKey}
            onGameOver={handleGameOver}
            onUpdateStats={handleUpdateStats}
            onSurvivorsUpdate={handleSurvivorsUpdate}
            isPaused={isPaused}
            selectedCountries={selectedCountries}
            enableDangerCircle={enableDangerCircle}
            enableSafeArch={enableSafeArch}
            pointsDeduction={pointsDeduction}
            enableBomb={enableBomb}
            enableMovingBomb={enableMovingBomb}
          />
        )}
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

      {/* Agent Video Box + Survivor Ticker */}
      <div className="agent-video-box">
        <video src={agent1Video} autoPlay loop muted playsInline />
      </div>
      {spotlightCode && (
        <div className="survivor-ticker">
          <img
            src={getFlagUrl(spotlightCode)}
            alt={spotlightCode}
            className="survivor-ticker-flag"
          />
          <span className="survivor-ticker-name">
            {displayedName}<span className="typewriter-cursor">|</span>
          </span>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fall" element={<GameContainer initialMode="FALL" />} />
        <Route path="/collider" element={<GameContainer initialMode="COLLIDER" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
