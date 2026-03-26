import { getFlagUrl, COUNTRY_CODES, getCountryName } from '../utils/flags';
import { useState, useEffect } from 'react';

interface GameUIProps {
  alive: number;
  cycle: number;
  leaderboard: { countryCode: string; wins: number }[];
  isPaused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
  tab: 'STATS' | 'LEADERBOARD' | 'SETTINGS';
  setTab: (tab: 'STATS' | 'LEADERBOARD' | 'SETTINGS') => void;
  selectedCountries: string[];
  onApplySettings: (countries: string[]) => void;
}

export function GameUI({
  alive,
  cycle,
  leaderboard,
  isPaused,
  onTogglePause,
  onStop,
  tab,
  setTab,
  selectedCountries,
  onApplySettings
}: GameUIProps) {
  // Sort leaderboard descending by wins
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.wins - a.wins);

  const [localSelection, setLocalSelection] = useState<string[]>(selectedCountries);
  const [settingsTab, setSettingsTab] = useState<'FLAGS'>('FLAGS');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLocalSelection(selectedCountries);
  }, [selectedCountries]);

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
    onApplySettings(localSelection);
    setTab('LEADERBOARD');
  };

  return (
    <div className="game-ui">
      {/* Top Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'STATS' ? 'active' : ''}`}
          onClick={() => setTab('STATS')}
        >
          STATS
        </button>
        <button
          className={`tab ${tab === 'LEADERBOARD' ? 'active' : ''}`}
          onClick={() => setTab('LEADERBOARD')}
        >
          LEADERBOARD
        </button>
        <button
          className={`tab ${tab === 'SETTINGS' ? 'active' : ''}`}
          onClick={() => setTab('SETTINGS')}
        >
          ⚙️
        </button>
      </div>

      <div className="ui-content">
        {tab === 'STATS' ? (
          <div className="stats-panel">
            <div className="stat-box">
              <span>Cycle:</span>
              <span className="cyan-text">{cycle}</span>
            </div>
            <div className="stat-box">
              <span>Alive:</span>
              <span className="cyan-text">{alive}</span>
            </div>
            
            <div className="controls">
              <button className="control-btn" onClick={onTogglePause}>
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button className="control-btn pink-btn" onClick={onStop}>
                Stop
              </button>
            </div>
          </div>
        ) : tab === 'SETTINGS' ? (
          <div className="settings-panel">
            <div className="sub-tabs">
              <button 
                className={`tab sub-tab ${settingsTab === 'FLAGS' ? 'active' : ''}`}
                onClick={() => setSettingsTab('FLAGS')}
              >
                SELECT FLAGS
              </button>
            </div>

            {settingsTab === 'FLAGS' && (
              <>
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
          </div>
        ) : (
          <div className="leaderboard-panel">
            {sortedLeaderboard.slice(0, 5).map((entry, idx) => (
              <div key={entry.countryCode} className="leaderboard-row">
                <div className="ld-left">
                  <span className="ld-rank">#{idx + 1}</span>
                  <img src={getFlagUrl(entry.countryCode)} alt={entry.countryCode} className="ld-flag" />
                  <span className="ld-code">{entry.countryCode.toUpperCase()}</span>
                </div>
                <div className="ld-wins pink-text">{entry.wins} Wins</div>
              </div>
            ))}
            {sortedLeaderboard.length === 0 && (
              <div className="empty-text">No wins yet...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
