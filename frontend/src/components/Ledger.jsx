import { useState, useEffect } from 'react';

export default function Ledger({ expenses, addExpense, participants }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');

  // Sync initial payer when participants load
  useEffect(() => {
    if (participants.length > 0 && !payer) {
      setPayer(participants[0]);
    }
  }, [participants, payer]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!description || !amount || !payer) return;
    addExpense({
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      payer,
      participants // For simplicity in this demo, everyone splits equally
    });
    setDescription('');
    setAmount('');
  };

  return (
    <div className="card">
      <h2>Group Ledger</h2>
      <form onSubmit={handleAdd} className="add-expense-form">
        <div className="form-group">
          <input 
            type="text" 
            placeholder="Expense description (e.g. Dinner)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="input-field"
          />
        </div>
        <div className="form-row">
          <input 
            type="number" 
            placeholder="Amount (₹)" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className="input-field amount-field"
          />
          <select value={payer} onChange={(e) => setPayer(e.target.value)} className="input-field">
            {participants.map(p => <option key={p} value={p}>{p} paid</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">Add Expense</button>
      </form>

      <div className="expense-list">
        {expenses.length === 0 ? <p className="empty-state">No expenses yet. Start adding some!</p> : null}
        {expenses.map(exp => (
          <div key={exp.id} className="expense-item">
            <div className="expense-info">
              <span className="expense-desc">{exp.description}</span>
              <span className="expense-meta">{exp.payer} paid ₹{exp.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
