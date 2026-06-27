import React from 'react';
import paymentIllustration from '../assets/payment_illustration.png';
import './Sidebar.css';

export default function Sidebar({ currentTab, setCurrentTab, handleLogout }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <img src={paymentIllustration} alt="SmartSplit" className="sidebar-logo" />
        <h2>SmartSplit AI</h2>
      </div>

      <div className="sidebar-menu">
        <button 
          className={`menu-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <span className="icon">📊</span>
          <span className="label">Dashboard</span>
        </button>

        <button 
          className={`menu-item ${currentTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setCurrentTab('expenses')}
        >
          <span className="icon">💳</span>
          <span className="label">Expenses</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="menu-item logout-btn" onClick={handleLogout}>
          <span className="icon">🚪</span>
          <span className="label">Logout</span>
        </button>
      </div>
    </nav>
  );
}
