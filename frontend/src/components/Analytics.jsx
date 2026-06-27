export default function Analytics({ expenses }) {
  const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const spendByPerson = expenses.reduce((acc, exp) => {
    acc[exp.payer] = (acc[exp.payer] || 0) + exp.amount;
    return acc;
  }, {});

  return (
    <div className="card analytics-card">
      <h2>Trip Analytics</h2>
      <div className="stats-grid">
        <div className="stat-box highlight">
          <span className="stat-label">Total Group Spend</span>
          <span className="stat-value">₹{totalSpend.toFixed(2)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Total Expenses</span>
          <span className="stat-value">{expenses.length}</span>
        </div>
      </div>
      
      {Object.keys(spendByPerson).length > 0 && (
        <div className="spending-breakdown">
          <h3>Who paid what</h3>
          <ul>
            {Object.entries(spendByPerson)
              .sort((a, b) => b[1] - a[1])
              .map(([person, amount]) => (
              <li key={person}>
                <span>{person}</span>
                <strong>₹{amount.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
