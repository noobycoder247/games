import { getFlagUrl, COUNTRY_CODES, getCountryName } from '../utils/flags';
import { useState, useEffect } from 'react';

interface GameUIProps {
  leaderboard: { countryCode: string; wins: number }[];
  tab: 'LEADERBOARD' | 'SETTINGS';
  setTab: (tab: 'LEADERBOARD' | 'SETTINGS') => void;
  selectedCountries: string[];
  enableDangerCircle: boolean;
  enableSafeArch: boolean;
  pointsDeduction: number;
  enableBomb: boolean;
  enableMovingBomb: boolean;
  onApplySettings: (countries: string[], dangerCircle: boolean, safeArch: boolean, deduction: number, bomb: boolean, movingBomb: boolean) => void;
  cycle: number;
  alive: number;
  totalParticipants: number;
  gameMode: 'FALL' | 'COLLIDER';
  setGameMode: (mode: 'FALL' | 'COLLIDER') => void;
  // YouTube Integration Props
  youtubeConfig: { videoId: string; apiKey: string; isConnected: boolean };
  onYoutubeToggle: (videoId: string, apiKey: string, connect: boolean) => void;
}

export function GameUI({
  leaderboard,
  tab,
  setTab,
  selectedCountries,
  enableDangerCircle,
  enableSafeArch,
  pointsDeduction,
  enableBomb,
  enableMovingBomb,
  onApplySettings,
  cycle,
  alive,
  totalParticipants,
  gameMode,
  setGameMode,
  youtubeConfig,
  onYoutubeToggle
}: GameUIProps) {
  // Sort leaderboard descending by wins
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.wins - a.wins);

  const [localSelection, setLocalSelection] = useState<string[]>(selectedCountries);
  const [localDangerCircle, setLocalDangerCircle] = useState(enableDangerCircle);
  const [localSafeArch, setLocalSafeArch] = useState(enableSafeArch);
  const [localPointsDeduction, setLocalPointsDeduction] = useState(pointsDeduction);
  const [localEnableBomb, setLocalEnableBomb] = useState(enableBomb);
  const [localEnableMovingBomb, setLocalEnableMovingBomb] = useState(enableMovingBomb);
  const [settingsTab, setSettingsTab] = useState<'FLAGS' | 'YOUTUBE'>('FLAGS');
  const [searchQuery, setSearchQuery] = useState('');

  const [vtVideoId, setVtVideoId] = useState(youtubeConfig.videoId);
  const [vtApiKey, setVtApiKey] = useState(youtubeConfig.apiKey);

  useEffect(() => {
    setLocalSelection(selectedCountries);
    setLocalDangerCircle(enableDangerCircle);
    setLocalSafeArch(enableSafeArch);
    setLocalPointsDeduction(pointsDeduction);
    setLocalEnableBomb(enableBomb);
    setLocalEnableMovingBomb(enableMovingBomb);
  }, [selectedCountries, enableDangerCircle, enableSafeArch, pointsDeduction, enableBomb, enableMovingBomb]);

  const filteredCodes = COUNTRY_CODES.filter(code => {
    const name = getCountryName(code).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handleSelectAll = () => setLocalSelection([...COUNTRY_CODES]);
  const handleDeselectAll = () => setLocalSelection([]);

  const toggleCountry = (code: string) => {
    setLocalSelection(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleApply = () => {
    onApplySettings(localSelection, localDangerCircle, localSafeArch, localPointsDeduction, localEnableBomb, localEnableMovingBomb);
    setTab('LEADERBOARD');
  };

  return (
    <div className="game-ui">
      <div className="ui-content">
        {tab === 'SETTINGS' ? (
          <div className="settings-panel">
            <div className="sub-tabs">
              <button 
                className={`tab sub-tab ${settingsTab === 'FLAGS' ? 'active' : ''}`}
                onClick={() => setSettingsTab('FLAGS')}
              >
                SELECT FLAGS
              </button>
              <button 
                className={`tab sub-tab ${settingsTab === 'YOUTUBE' ? 'active' : ''}`}
                onClick={() => setSettingsTab('YOUTUBE')}
              >
                YOUTUBE CHAT
              </button>
            </div>

            {settingsTab === 'FLAGS' && (
              <>
                <div className="game-mode-selector" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button 
                    className={`control-btn small-btn ${gameMode === 'FALL' ? 'pink-btn' : ''}`}
                    onClick={() => setGameMode('FALL')}
                  >
                    Flag Fall
                  </button>
                  <button 
                    className={`control-btn small-btn ${gameMode === 'COLLIDER' ? 'pink-btn' : ''}`}
                    onClick={() => setGameMode('COLLIDER')}
                  >
                    Flag Collider
                  </button>
                </div>
                {gameMode === 'COLLIDER' && (
                  <div className="settings-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={localDangerCircle} onChange={(e) => setLocalDangerCircle(e.target.checked)} />
                        Danger Circle
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: localDangerCircle ? 'pointer' : 'not-allowed', opacity: localDangerCircle ? 1 : 0.5 }}>
                        <input type="checkbox" disabled={!localDangerCircle} checked={localDangerCircle && localSafeArch} onChange={(e) => setLocalSafeArch(e.target.checked)} />
                        Safe Arch
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={localEnableBomb} onChange={(e) => setLocalEnableBomb(e.target.checked)} />
                        Center Bomb
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={localEnableMovingBomb} onChange={(e) => setLocalEnableMovingBomb(e.target.checked)} />
                        Moving Bomb Flag
                      </label>
                    </div>
                    <div className="deduction-settings" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '12px', opacity: 0.8 }}>Points Deduction:</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={localPointsDeduction} 
                        onChange={(e) => setLocalPointsDeduction(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#ff00ff' }}
                      />
                      <span style={{ minWidth: '25px', fontWeight: 'bold', color: '#ff00ff' }}>{localPointsDeduction}</span>
                    </div>
                  </div>
                )}
                <div className="settings-header">
                  <div className="search-actions">
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search flags..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="control-btn small-btn" onClick={handleSelectAll}>All</button>
                    <button className="control-btn small-btn" onClick={handleDeselectAll}>None</button>
                  </div>
                  <button className="control-btn pink-btn" onClick={handleApply}>
                    Apply & Restart ({localSelection.length})
                  </button>
                </div>
                <div className="flag-grid">
                  {filteredCodes.map(code => (
                    <div 
                      key={code} 
                      className={`flag-item ${localSelection.includes(code) ? 'selected' : ''}`} 
                      onClick={() => toggleCountry(code)}
                      title={getCountryName(code)}
                    >
                      <img src={getFlagUrl(code)} alt={code} />
                      <span>{code.toUpperCase()}</span>
                    </div>
                  ))}
                  {filteredCodes.length === 0 && (
                    <div className="empty-text">No flags found.</div>
                  )}
                </div>
              </>
            )}

            {settingsTab === 'YOUTUBE' && (
              <div className="youtube-settings" style={{ padding: '10px' }}>
                <p style={{ fontSize: '11px', color: '#aaa', marginBottom: '15px' }}>
                  Enter your YouTube Video ID and API Key to automatically add countries from live chat.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#00ffff' }}>VIDEO ID (e.g. jNQXAC9IVRw)</label>
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="YouTube Video ID..." 
                      value={vtVideoId}
                      onChange={(e) => setVtVideoId(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ff00ff' }}>API KEY (Data API v3)</label>
                    <input 
                      type="password" 
                      className="search-input" 
                      placeholder="Enter API Key" 
                      value={vtApiKey}
                      onChange={(e) => setVtApiKey(e.target.value)}
                    />
                  </div>
                  <button 
                    className={`control-btn ${youtubeConfig.isConnected ? 'pink-btn' : 'cyan-btn'}`}
                    onClick={() => onYoutubeToggle(vtVideoId, vtApiKey, !youtubeConfig.isConnected)}
                    style={{ height: '40px', marginTop: '10px' }}
                  >
                    {youtubeConfig.isConnected ? 'DISCONNECT' : 'CONNECT CHAT'}
                  </button>
                  {youtubeConfig.isConnected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                      <div className="pulse-dot" style={{ width: '10px', height: '10px', background: '#0f0', borderRadius: '50%' }}></div>
                      <span style={{ fontSize: '12px', color: '#0f0' }}>Listening for Country Names...</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>How to use:</h4>
                  <ul style={{ fontSize: '11px', color: '#ccc', paddingLeft: '15px', margin: 0 }}>
                    <li>Get a free YouTube Data API v3 key from Google Cloud.</li>
                    <li>Copy the ID from your live stream URL.</li>
                    <li>Viewers type country names (e.g. "India", "USA") in chat to join!</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="leaderboard-panel">
            <h3 className="leaderboard-title">Top Winners</h3>
            {sortedLeaderboard.slice(0, 3).map((entry, idx) => (
              <div key={entry.countryCode} className="leaderboard-row">
                <div className="ld-left">
                  <span className="ld-rank">{idx + 1}</span>
                  <img src={getFlagUrl(entry.countryCode)} alt={entry.countryCode} className="ld-flag" />
                  <span className="ld-code" title={getCountryName(entry.countryCode)}>
                    {getCountryName(entry.countryCode).length > 10
                      ? getCountryName(entry.countryCode).substring(0, 10) + '...'
                      : getCountryName(entry.countryCode)}
                  </span>
                </div>
                <div className="ld-wins">{entry.wins}W</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {tab === 'LEADERBOARD' && (
        <div className="game-stats-footer">
          <span className="gs-round">
            ROUND <span className="gs-number">{cycle}</span>
          </span>
          <span className="gs-survival">
            {alive}/{totalParticipants}
          </span>
        </div>
      )}
    </div>
  );
}
