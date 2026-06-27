import React, { useState } from 'react';
import './UserManagement.css';

export default function UserManagement({ users = [], currentUser, onAddUser, onDeleteUser }) {
  const [newName, setNewName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddUser(newName.trim());
    setNewName('');
  };

  return (
    <div className="card user-management">
      <div className="um-header">
        <h2>Group Members</h2>
        <span className="um-count">{users.length}</span>
      </div>
      
      <div className="um-list">
        {users.length === 0 ? (
          <p className="empty-state" style={{margin: 0, padding: '8px 0'}}>No members yet.</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="um-chip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{user.name}</span>
              {currentUser && currentUser.id !== user.id && (
                <button 
                  onClick={() => onDeleteUser(user.id)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--expense-color)', 
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0 5px'
                  }}
                  title="Remove User"
                >
                  &times;
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="um-form">
        <input 
          type="text" 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a new person..."
          className="form-input"
          required
        />
        <button type="submit" className="btn-primary btn-sm">Add</button>
      </form>
    </div>
  );
}
