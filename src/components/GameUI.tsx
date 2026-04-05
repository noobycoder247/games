import { getFlagUrl, COUNTRY_CODES, getCountryName } from '../utils/flags';
import { useState, useEffect } from 'react';

interface GameUIProps {
  leaderboard: { countryCode: string; wins: number }[];
  tab: 'LEADERBOARD' | 'SETTINGS';
  setTab: (tab: 'LEADERBOARD' | 'SETTINGS') => void;
  selectedCountries: string[];
  onApplySettings: (countries: string[]) => void;
  cycle: number;
  alive: number;
  totalParticipants: number;
}

export function GameUI({
  leaderboard,
  tab,
  setTab,
  selectedCountries,
  onApplySettings,
  cycle,
  alive,
  totalParticipants
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
