import React, { useState } from 'react';
import { initiatePhonePePayment } from '../lib/paymentApi';

export default function SettleUp({ settlements, paidStatus, currentUser }) {
  const [loadingId, setLoadingId] = useState(null);

  const handlePay = async (settlement) => {
    const settlementId = settlement.id;
    setLoadingId(settlementId);
    try {
      const result = await initiatePhonePePayment(settlement.amount, settlementId);
      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate payment: ' + err.message);
      setLoadingId(null);
    }
  };

  // Only show settlements involving the current user
  const relevantSettlements = currentUser 
    ? settlements.filter(s => s.from === currentUser.name || s.to === currentUser.name)
    : settlements;

  if (relevantSettlements.length === 0) {
    return (
      <div className="card empty-settlement">
        <h2>Total Settlements</h2>
        <p className="empty-state">No pending settlements. Everything is settled! 🎉</p>
      </div>
    );
  }

  return (
    <div className="settlements-container">
      <h2 style={{marginBottom: '24px', color: 'var(--text-main)', fontSize: '24px', fontWeight: 600}}>Total Settlements</h2>
      <div className="settlement-cards">
        {relevantSettlements.map((s, index) => {
          const settlementId = s.id;
          const isPaid = paidStatus[settlementId];
          
          const isFromCurrentUser = currentUser && s.from === currentUser.name;
          const isToCurrentUser = currentUser && s.to === currentUser.name;

          let displayText = '';
          let initial = '';

          if (isFromCurrentUser) {
            displayText = `You owe ${s.to}`;
            initial = s.to.charAt(0).toUpperCase();
          } else if (isToCurrentUser) {
            displayText = `${s.from} owes you`;
            initial = s.from.charAt(0).toUpperCase();
          } else {
            displayText = `${s.from} owes ${s.to}`;
            initial = s.from.charAt(0).toUpperCase();
          }

          return (
            <div key={index} className="settlement-card">
              <div className="settlement-card-header">
                <div className="settlement-user">
                  <div className="settlement-avatar">{initial}</div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span className="settlement-name">{displayText}</span>
                  </div>
                </div>
                <div className={`badge ${isPaid ? 'badge-paid' : 'badge-pending'}`}>
                  {isPaid ? 'Paid ✔' : 'Pending'}
                </div>
              </div>
              
              <div className="settlement-card-body">
                <div className="settlement-amount-display">
                  ₹{s.amount.toFixed(2)}
                </div>
                
                <div className="settlement-action-area">
                  {isFromCurrentUser ? (
                    isPaid ? (
                      <span className="status-text success">Settled</span>
                    ) : (
                      <button 
                        className="btn-pay-action"
                        onClick={() => handlePay(s)}
                        disabled={loadingId === settlementId}
                      >
                        {loadingId === settlementId ? 'Redirecting...' : 'Pay with PhonePe'}
                      </button>
                    )
                  ) : (
                    <span className="status-text muted">
                      {isPaid ? 'Settled' : 'Waiting for Payment'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
