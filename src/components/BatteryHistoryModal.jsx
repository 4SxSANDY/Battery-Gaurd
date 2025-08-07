import React from 'react';

const BatteryHistoryModal = ({ history, setShowHistory, exportHistory }) => {
  return (
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
                    {entry.event ? (
                      <span className="event-badge">{entry.event}</span>
                    ) : entry.charging ? (
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
  );
};

export default BatteryHistoryModal;
