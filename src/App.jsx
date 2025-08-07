import React, { useEffect, useState, useRef } from 'react';
import BatteryDisplay from './components/BatteryDisplay';
import BatteryHistoryModal from './components/BatteryHistoryModal';
import BatteryChartModal from './components/BatteryChartModal';
import Toast from './components/Toast';

import './index.css';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';

// Defensive function to safely parse battery history from localStorage
const safeParseHistory = () => {
  try {
    const stored = localStorage.getItem('batteryHistory');
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    // Only keep valid entries
    return parsed.filter(entry =>
      entry && typeof entry.time === 'string' &&
      typeof entry.level === 'number' &&
      typeof entry.charging === 'boolean'
    );
  } catch {
    localStorage.removeItem('batteryHistory');
    return [];
  }
};

const App = () => {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(null);
  const [batteryTemp, setBatteryTemp] = useState(36.5); // Start at 36.5°C
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });
  const [soundOn, setSoundOn] = useState(() => {
    const stored = localStorage.getItem('soundOn');
    return stored ? JSON.parse(stored) : true;
  });
  const [history, setHistory] = useState(safeParseHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [filterDays, setFilterDays] = useState(1);
  const [chartType, setChartType] = useState('area');
  const batteryRef = useRef(null);
  const [prevCharging, setPrevCharging] = useState(null);
  const lastNotifiedHigh = useRef(null);
  const lastNotifiedLow = useRef(null);
  const audioUnlocked = useRef(false);
  
  const filteredHistory = history.filter((entry) => {
    const entryDate = new Date(entry.time);
    const now = new Date();
    return now - entryDate <= filterDays * 24 * 60 * 60 * 1000;
  });

  // Helper to update history safely
  const updateHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history.slice(0, 49)].filter(entry =>
      entry && typeof entry.time === 'string' &&
      typeof entry.level === 'number' &&
      typeof entry.charging === 'boolean'
    );
    setHistory(updatedHistory);
    localStorage.setItem('batteryHistory', JSON.stringify(updatedHistory));
  };

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlocked.current = true;
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  useEffect(() => {
    navigator.getBattery().then((battery) => {
      updateBatteryInfo(battery);
      battery.addEventListener('levelchange', () => updateBatteryInfo(battery));
      battery.addEventListener('chargingchange', () => updateBatteryInfo(battery));
    });
    // Animation for battery level
    if (batteryRef.current) {
      batteryRef.current.style.height = `${batteryLevel || 0}%`;
    }
  }, [darkMode, soundOn, batteryLevel]);

  const playAlert = () => {
    if (!soundOn) {
      console.log('Sound is OFF, not playing alert.');
      return;
    }
    if (!audioUnlocked.current) {
      console.log('Audio not unlocked by user interaction yet.');
      return;
    }
    try {
      const audio = new Audio('/new-alert.mp3');
      audio.play().then(() => {
        console.log('Notification sound played.');
      }).catch((err) => {
        console.error('Audio play failed:', err);
      });
    } catch (err) {
      console.error('Audio error:', err);
    }
  };

  const notify = (msg) => {
    if (Notification.permission === 'granted') {
      new Notification('Battery Guard', { 
        body: msg,
        icon: '/battery-icon.png' 
      });
    }
  };

  const updateBatteryInfo = (battery) => {
    const level = Math.round(battery.level * 100);
    setBatteryLevel(level);
    setIsCharging(battery.charging);

    // Only log when charging state changes (not on first run)
    if (prevCharging !== null && prevCharging !== battery.charging) {
      const timestamp = new Date().toLocaleString();
      const newEntry = {
        time: timestamp,
        level,
        charging: battery.charging,
        event: battery.charging ? 'Plugged In' : 'Plugged Out'
      };
      updateHistory(newEntry);
    }
    setPrevCharging(battery.charging);

    // Notification for each percent above 85% while charging
    if (battery.charging && level > 85) {
      if (lastNotifiedHigh.current !== level) {
        notify(`Battery is at ${level}%. Consider unplugging soon!`);
        playAlert();
        lastNotifiedHigh.current = level;
      }
    } else {
      lastNotifiedHigh.current = null; // reset when not charging or below threshold
    }

    // Notification for each percent below 20% while discharging
    if (!battery.charging && level < 20) {
      if (lastNotifiedLow.current !== level) {
        notify(`Battery is low: ${level}%. Please connect charger.`);
        playAlert();
        lastNotifiedLow.current = level;
      }
    } else {
      lastNotifiedLow.current = null; // reset when charging or above threshold
    }

    // Gradually adjust temperature
    setBatteryTemp(prevTemp => {
      let target = battery.charging ? 38 : 36; // Warmer when charging
      let change = (Math.random() - 0.5) * 0.2; // Small random drift
      let nextTemp = prevTemp + change;
      // Move towards target
      if (nextTemp < target) nextTemp += 0.05;
      if (nextTemp > target) nextTemp -= 0.05;
      // Clamp to reasonable range
      return Math.max(34, Math.min(40, nextTemp));
    });
  };

  const handleNotificationPermission = () => {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        showToast('Notifications enabled ✅');
      } else {
        showToast('Notifications denied ❌');
      }
    });
  };
  
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const exportHistory = () => {
    const csv = [
      'Time,Battery Level,Charging Status',
      ...history.map(entry => `"${entry.time}",${entry.level},"${entry.charging ? 'Charging' : 'Not Charging'}"`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'battery-history.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('History exported successfully!');
  };
  
  const getBatteryColor = () => {
    if (batteryLevel === null) return '#ccc';
    if (batteryLevel <= 20) return '#ff5252';
    if (batteryLevel <= 50) return '#ffa726';
    return '#66bb6a';
  };
  
  const getBatteryIcon = () => {
    if (batteryLevel === null) return '🔋';
    if (isCharging) return '⚡';
    if (batteryLevel <= 20) return '🪫';
    if (batteryLevel <= 50) return '🔋';
    return '🔋';
  };
  
  const renderChart = () => {
    if (filteredHistory.length === 0) {
      return <div className="no-data">No data available for selected time period</div>;
    }
    
    const chartData = filteredHistory.slice().reverse();
    
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="batteryLevel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#555" : "#ccc"} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }} 
              interval={Math.ceil(chartData.length / 5)} 
              stroke={darkMode ? "#ddd" : "#333"}
            />
            <YAxis domain={[0, 100]} stroke={darkMode ? "#ddd" : "#333"} />
            <Tooltip 
              contentStyle={{ backgroundColor: darkMode ? '#333' : '#fff', border: `1px solid ${darkMode ? '#555' : '#ccc'}` }}
              labelStyle={{ color: darkMode ? '#ddd' : '#333' }}
            />
            <Legend />
            <Area type="monotone" dataKey="level" stroke="#8884d8" fillOpacity={1} fill="url(#batteryLevel)" />
          </AreaChart>
        );
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#555" : "#ccc"} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }} 
              interval={Math.ceil(chartData.length / 5)} 
              stroke={darkMode ? "#ddd" : "#333"}
            />
            <YAxis domain={[0, 100]} stroke={darkMode ? "#ddd" : "#333"} />
            <Tooltip 
              contentStyle={{ backgroundColor: darkMode ? '#333' : '#fff', border: `1px solid ${darkMode ? '#555' : '#ccc'}` }}
              labelStyle={{ color: darkMode ? '#ddd' : '#333' }}
            />
            <Legend />
            <Line type="monotone" dataKey="level" stroke="#3498db" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#555" : "#ccc"} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }} 
              interval={Math.ceil(chartData.length / 5)} 
              stroke={darkMode ? "#ddd" : "#333"}
            />
            <YAxis domain={[0, 100]} stroke={darkMode ? "#ddd" : "#333"} />
            <Tooltip 
              contentStyle={{ backgroundColor: darkMode ? '#333' : '#fff', border: `1px solid ${darkMode ? '#555' : '#ccc'}` }}
              labelStyle={{ color: darkMode ? '#ddd' : '#333' }}
            />
            <Legend />
            <Bar dataKey="level" fill="#3498db" />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-wrapper">
      <div className={`container ${isCharging ? 'charging' : ''}`}>
        <div className="header">
          <div className="toggle-group">
            <div className="theme-toggle">
              <input
                type="checkbox"
                id="darkmode-toggle"
                className="toggle-input"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
              <label htmlFor="darkmode-toggle" className="toggle-label" aria-label="Toggle dark mode">
                <span className="toggle-icon1">🌞</span>
                <span className="toggle-icon2">🌙</span>
                <span className="toggle-ball"></span>
              </label>
            </div>
            <div className="theme-toggle">
              <input
                type="checkbox"
                id="sound-toggle"
                className="toggle-input"
                checked={soundOn}
                onChange={() => {
                  const updated = !soundOn;
                  setSoundOn(updated);
                  localStorage.setItem('soundOn', JSON.stringify(updated));
                }}
              />
              <label htmlFor="sound-toggle" className="toggle-label" aria-label="Toggle sound">
                <span className="toggle-icon1">🔇</span>
                <span className="toggle-icon2">🔊</span>
                <span className="toggle-ball"></span>
              </label>
            </div>
          </div>
          <div className="header-buttons">
            <button className="info-btn" onClick={() => setShowInfo(true)} aria-label="Show app information">
              ℹ️
            </button>
            <button className="notify-btn pulse" onClick={handleNotificationPermission} aria-label="Enable notifications">
              🔔
            </button>
          </div>
        </div>
        
        <h1 className="app-title">Battery Guard</h1>
        
        <div className="battery-display">
          <div className="battery-wrapper">
            <div className="battery-outline">
              <div 
                ref={batteryRef}
                className="battery-level" 
                style={{ 
                  height: `${batteryLevel || 0}%`, 
                  backgroundColor: getBatteryColor(),
                  transition: 'height 1s ease-in-out, background-color 1s'
                }}
              ></div>
              {isCharging && (
                <div className="battery-charging">
                  <span>⚡</span>
                </div>
              )}
            </div>
            <div className="battery-cap"></div>
          </div>
          
          <div className="battery-info">
            <h2 className="battery-percentage">{batteryLevel !== null ? `${batteryLevel}%` : 'Loading...'}</h2>
            <p className="battery-status">
              <span className={`status-indicator ${isCharging ? 'charging' : 'discharging'}`}></span>
              {isCharging ? 'Charging' : 'Not Charging'}
            </p>
            <p className="temp-info">
              <span className="temp-icon">🌡️</span> {batteryTemp.toFixed(1)} °C
            </p>
          </div>
        </div>
        
        <div className="button-group">
          <button className="action-button history-btn" onClick={() => setShowHistory(true)}>
            <span className="button-icon">📜</span>
            <span className="button-text">Charge History</span>
          </button>
          <button className="action-button chart-btn" onClick={() => setShowChart(true)}>
            <span className="button-icon">📊</span>
            <span className="button-text">Charge Chart</span>
          </button>
        </div>
        
        {/* Charging Animation */}
        {isCharging && (
          <div className="charging-indicator">
            <div className="charging-dot"></div>
            <div className="charging-dot"></div>
            <div className="charging-dot"></div>
          </div>
        )}
      </div>

      {showHistory && (
        <BatteryHistoryModal
          history={Array.isArray(history) ? history : []}
          setShowHistory={setShowHistory}
          exportHistory={exportHistory}
        />
      )}

      {showChart && (
        <div className="modal-overlay" onClick={() => setShowChart(false)}>
          <div className="modal-content chart-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">📊 Battery Level Chart</h2>
            <div className="chart-controls">
              <div className="filter-control">
                <label htmlFor="filter-days">Time period: </label>
                <select 
                  id="filter-days"
                  value={filterDays} 
                  onChange={(e) => setFilterDays(Number(e.target.value))}
                  className="select-control"
                >
                  <option value={1}>Last 24 Hours</option>
                  <option value={3}>Last 3 Days</option>
                  <option value={7}>Last Week</option>
                  <option value={30}>Last Month</option>
                </select>
              </div>
              
              <div className="chart-type-control">
                <div className="filter-options">
                  <button 
                    className={chartType === 'area' ? 'active' : ''} 
                    onClick={() => setChartType('area')}
                  >
                    Area
                  </button>
                  <button 
                    className={chartType === 'line' ? 'active' : ''} 
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                  <button 
                    className={chartType === 'bar' ? 'active' : ''} 
                    onClick={() => setChartType('bar')}
                  >
                    Bar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
            
            <button className="close-btn" onClick={() => setShowChart(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content info-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">ℹ️ How to Use Battery Guard</h2>
            
            <div className="info-content">
              <div className="info-section">
                <h3>📱 Basic Features</h3>
                <ul>
                  <li><strong>Battery Level:</strong> Shows your current battery percentage in real-time</li>
                  <li><strong>Charging Status:</strong> Indicates if your device is charging or discharging</li>
                  <li><strong>Temperature:</strong> <em>Note: This is a simulated temperature for demonstration purposes only</em></li>
                </ul>
              </div>

              <div className="info-section">
                <h3>🔔 Notifications</h3>
                <ul>
                  <li><strong>Low Battery:</strong> Get notified when battery drops below 20%</li>
                  <li><strong>High Battery:</strong> Get notified when battery goes above 85% while charging</li>
                  <li><strong>Sound Alerts:</strong> Toggle sound on/off using the 🔊 button</li>
                  <li><strong>Permission:</strong> Click the 🔔 button to enable notifications</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>📜 Charge History</h3>
                <ul>
                  <li><strong>View History:</strong> Click "Charge History" button to see past charging events</li>
                  <li><strong>Download Data:</strong> Export your battery history as a CSV file</li>
                  <li><strong>Event Log:</strong> See when you plugged in/out your charger</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>📊 Battery Charts</h3>
                <ul>
                  <li><strong>Visual Data:</strong> Click "Charge Chart" to see battery level trends</li>
                  <li><strong>Time Periods:</strong> Choose from 24 hours, 3 days, 1 week, or 1 month</li>
                  <li><strong>Chart Types:</strong> Switch between Area, Line, and Bar charts</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>🌙 Dark Mode</h3>
                <ul>
                  <li><strong>Toggle Theme:</strong> Switch between light and dark modes using the 🌞/🌙 button</li>
                  <li><strong>Auto Save:</strong> Your preference is automatically saved</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>⚠️ Important Notes</h3>
                <ul>
                  <li><strong>Temperature Display:</strong> The temperature shown is simulated and not real battery temperature</li>
                  <li><strong>Browser Permissions:</strong> Allow notifications and device motion for full functionality</li>
                  <li><strong>Data Storage:</strong> All data is stored locally in your browser</li>
                </ul>
              </div>
            </div>
            
            <button className="close-btn" onClick={() => setShowInfo(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
};

export default App;



