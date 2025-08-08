import React, { useEffect, useState, useRef } from 'react'; // React core imports
import BatteryDisplay from './components/BatteryDisplay'; // Custom component import
import BatteryHistoryModal from './components/BatteryHistoryModal'; // Custom component import
import BatteryChartModal from './components/BatteryChartModal'; // Custom component import
import Toast from './components/Toast'; // Custom component import

import './index.css'; // Styles import
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
} from 'recharts'; // Chart library imports

const App = () => {
  // State initialization with localStorage
  const [batteryLevel, setBatteryLevel] = useState(null); // Battery level state
  const [isCharging, setIsCharging] = useState(null); // Charging status state
  const [batteryTemp, setBatteryTemp] = useState('Loading...'); // Battery temperature state

  // State initialization with localStorage for dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });

  // State initialization with localStorage for sound toggle
  const [soundOn, setSoundOn] = useState(() => {
    const stored = localStorage.getItem('soundOn');
    return stored ? JSON.parse(stored) : true;
  });

  // State initialization with localStorage for battery history
  const [history, setHistory] = useState(() => {
    const stored = localStorage.getItem('batteryHistory');
    return stored ? JSON.parse(stored) : [];
  });

  // UI state for modals and chart controls
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [filterDays, setFilterDays] = useState(1);
  const [chartType, setChartType] = useState('area');
  const batteryRef = useRef(null); // Ref for battery animation

  // Filter battery history for chart
  const filteredHistory = history.filter((entry) => {
    const entryDate = new Date(entry.time);
    const now = new Date();
    return now - entryDate <= filterDays * 24 * 60 * 60 * 1000;
  });

  // Main effect: handles dark mode, battery info, localStorage, and notifications
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
    localStorage.setItem('darkMode', JSON.stringify(darkMode)); // Save dark mode to localStorage

    // Play alert sound if enabled
    const playAlert = () => {
      if (soundOn) {
        const audio = new Audio('/alert.mp3');
        audio.play();
      }
    };

    // Notification API usage for battery alerts
    const notify = (msg) => {
      if (Notification.permission === 'granted') {
        new Notification('Battery Guard', { 
          body: msg,
          icon: '/battery-icon.png' 
        });
      }
    };

    // Battery info update and localStorage save
    const updateBatteryInfo = (battery) => {
      const level = Math.round(battery.level * 100);
      setBatteryLevel(level);
      setIsCharging(battery.charging);
      const timestamp = new Date().toLocaleString();
      const newEntry = { time: timestamp, level, charging: battery.charging };
      const updatedHistory = [newEntry, ...history.slice(0, 49)];
      setHistory(updatedHistory);
      localStorage.setItem('batteryHistory', JSON.stringify(updatedHistory)); // Save history to localStorage

      // Battery alert logic
      if (battery.charging && level >= 95) {
        playAlert();
        notify('Battery is almost full! Unplug the charger.');
      } else if (!battery.charging && level <= 15) {
        playAlert();
        notify('Battery is low! Please connect charger.');
      }
      // Fake temperature for UI
      const fakeTemp = (30 + Math.random() * 15).toFixed(1);
      setBatteryTemp(`${fakeTemp} °C`);
    };

    // Battery API event listeners
    navigator.getBattery().then((battery) => {
      updateBatteryInfo(battery);
      battery.addEventListener('levelchange', () => updateBatteryInfo(battery));
      battery.addEventListener('chargingchange', () => updateBatteryInfo(battery));
    });
    
    // Animate battery level bar
    if (batteryRef.current) {
      batteryRef.current.style.height = `${batteryLevel}%`;
    }
    
  }, [darkMode, soundOn, batteryLevel, history]);

  // Notification permission handler
  const handleNotificationPermission = () => {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        showToast('Notifications enabled ✅');
      } else {
        showToast('Notifications denied ❌');
      }
    });
  };
  
  // Toast notification state and function
  const [toast, setToast] = useState({ visible: false, message: '' });
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  // Export battery history as CSV
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
  
  // Helper: get battery color for UI
  const getBatteryColor = () => {
    if (batteryLevel === null) return '#ccc';
    if (batteryLevel <= 20) return '#ff5252';
    if (batteryLevel <= 50) return '#ffa726';
    return '#66bb6a';
  };
  
  // Helper: get battery icon for UI
  const getBatteryIcon = () => {
    if (batteryLevel === null) return '🔋';
    if (isCharging) return '⚡';
    if (batteryLevel <= 20) return '🪫';
    if (batteryLevel <= 50) return '🔋';
    return '🔋';
  };
  
  // Chart rendering logic
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
            {/* Dark mode toggle with localStorage */}
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
            {/* Sound toggle with localStorage */}
            <div className="theme-toggle">
              <input
                type="checkbox"
                id="sound-toggle"
                className="toggle-input"
                checked={soundOn}
                onChange={() => {
                  const updated = !soundOn;
                  setSoundOn(updated);
                  localStorage.setItem('soundOn', JSON.stringify(updated)); // Save sound toggle to localStorage
                }}
              />
              <label htmlFor="sound-toggle" className="toggle-label" aria-label="Toggle sound">
                <span className="toggle-icon1">🔇</span>
                <span className="toggle-icon2">🔊</span>
                <span className="toggle-ball"></span>
              </label>
            </div>
          </div>
          {/* Notification permission button */}
          <button className="notify-btn pulse" onClick={handleNotificationPermission} aria-label="Enable notifications">
            🔔
          </button>
        </div>
        
        <h1 className="app-title">Battery Guard</h1>
        
        {/* Battery display and info */}
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
              <span className="temp-icon">🌡️</span> {batteryTemp}
            </p>
          </div>
        </div>
        
        {/* History and chart buttons */}
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

      {/* History modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">📜 Charge History</h2>
            {history.length > 0 ? (
              <div className="history-content">
                <ul className="history-list">
                  {history.map((entry, index) => (
                    <li key={index} className={`history-item ${entry.charging ? 'charging-history' : ''}`}>
                      <div className="history-time">{entry.time}</div>
                      <div className="history-level">{entry.level}%</div>
                      <div className="history-status">
                        {entry.charging ? (
                          <span className="charging-badge">⚡ Charging</span>
                        ) : (
                          <span className="discharging-badge">Battery</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="modal-actions">
                  <button className="download-btn" onClick={exportHistory}>
                    📥 Export CSV
                  </button>
                  <button className="close-btn" onClick={() => setShowHistory(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <p className="no-data">No history data available yet</p>
            )}
          </div>
        </div>
      )}

      {/* Chart modal */}
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
      
      {/* Toast Notification */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
};

export default App;
