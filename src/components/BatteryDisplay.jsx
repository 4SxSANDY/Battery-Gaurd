import React from 'react';

const BatteryDisplay = ({ batteryLevel, isCharging, batteryTemp, batteryRef, getBatteryColor }) => {
  return (
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
  );
};

export default BatteryDisplay;
