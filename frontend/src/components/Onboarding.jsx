import React, { useState } from 'react';
import { registerUser, loginUser } from '../lib/paymentApi';
import paymentIllustration from '../assets/payment_illustration.png';
import './Onboarding.css';

export default function Onboarding({ onComplete }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bank, setBank] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    if (!isLogin && !bank.trim()) return;
    
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await loginUser(name.trim(), password.trim());
      } else {
        data = await registerUser(name.trim(), password.trim(), bank.trim());
      }
      
      localStorage.setItem('smartsplit_token', data.token);
      localStorage.setItem('smartsplit_current_user', JSON.stringify(data.user));
      onComplete(data.user);
    } catch (err) {
      alert(`Failed to ${isLogin ? 'login' : 'register'}: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      {/* Dynamic Background Effects */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="card onboarding-card">
        <div className="onboarding-header">
          <img src={paymentIllustration} alt="SmartSplit" className="onboarding-illustration" />
          <h1>SmartSplit AI</h1>
          <p>{isLogin ? "Welcome back! Login to your group." : "Welcome! Create your group ledger."}</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label>Your Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g., Alice" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-field" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <span 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </span>
            </div>
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label>Bank Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g., HDFC, SBI" 
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Processing..." : (isLogin ? "Login" : "Create Group")}
          </button>
          
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <span 
              style={{ cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Need a new group? Register here." : "Already have a group? Login here."}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
