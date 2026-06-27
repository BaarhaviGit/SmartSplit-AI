import React, { useMemo } from 'react';
import './DashboardOverview.css';
export default function DashboardOverview({ currentUser, expenses, settlements }) {
  // Calculate Net Balance
  const netBalance = useMemo(() => {
    let balance = 0;
    
    // Amount owed TO current user (Positive)
    if (settlements) {
      settlements.forEach(s => {
        if (s.to === currentUser.name) balance += s.amount;
        if (s.from === currentUser.name) balance -= s.amount;
      });
    }
    
    return balance;
  }, [settlements, currentUser]);

  // Get Recent Activity (expenses involving current user)
  const recentActivity = useMemo(() => {
    return expenses
      .filter(exp => exp.payer === currentUser.name || exp.participants.includes(currentUser.name))
      .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()))
      .slice(0, 4);
  }, [expenses, currentUser]);

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="balance-card card">
            <span className="balance-label">Your Net Balance</span>
            <h2 className="balance-amount" style={{ color: netBalance >= 0 ? 'var(--text-main)' : 'var(--expense-color)' }}>
              {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toFixed(2)}
            </h2>
            <div className="balance-trend">
              <span className={netBalance >= 0 ? 'trend-up' : 'trend-down'}>
                {netBalance >= 0 ? 'You are owed money' : 'You owe money'}
              </span>
            </div>
          </div>

          <div className="activity-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
            </div>
            
            <div className="activity-list card">
              {recentActivity.length === 0 ? (
                <p className="empty-state">No recent activity.</p>
              ) : (
                recentActivity.map(exp => {
                  const isPayer = exp.payer === currentUser.name;
                  const myShare = exp.amount / exp.participants.length;
                  const displayAmount = isPayer ? exp.amount - myShare : -myShare;
                  
                  return (
                    <div key={exp.id} className="activity-item">
                      <div className="activity-icon">
                        {isPayer ? '📈' : '📉'}
                      </div>
                      <div className="activity-details">
                        <h4>{exp.description}</h4>
                        <span className="activity-meta">{isPayer ? `You paid ₹${exp.amount.toFixed(2)}` : `${exp.payer} paid`}</span>
                      </div>
                      <div className={`activity-amount ${displayAmount > 0 ? 'positive' : 'negative'}`}>
                        {displayAmount > 0 ? '+' : ''}₹{Math.abs(displayAmount).toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-side">
          <div className="virtual-card-section">
            <h3>My Cards</h3>
            <div className="virtual-card">
              <div className="card-top">
                <span className="card-chip"></span>
                <span className="card-contactless">)))</span>
              </div>
              <div className="card-middle">
                <div className="card-number">**** **** **** 3486</div>
                <div className="card-balance">₹{Math.abs(netBalance).toFixed(2)}</div>
              </div>
              <div className="card-bottom">
                <span className="card-name">{currentUser.name.toUpperCase()}</span>
                <span className="card-bank">{currentUser.bank.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
