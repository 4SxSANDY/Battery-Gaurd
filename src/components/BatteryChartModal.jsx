import React from 'react';
import { ResponsiveContainer } from 'recharts';

const BatteryChartModal = ({
  showChart,
  setShowChart,
  filterDays,
  setFilterDays,
  chartType,
  setChartType,
  renderChart
}) => {
  return (
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
              {['area', 'line', 'bar'].map(type => (
                <button 
                  key={type}
                  className={chartType === type ? 'active' : ''}
                  onClick={() => setChartType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
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
  );
};

export default BatteryChartModal;
