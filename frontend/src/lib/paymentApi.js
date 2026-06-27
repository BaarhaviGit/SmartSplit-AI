const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('smartsplit_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function registerUser(name, password, bank) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password, bank })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Registration failed');
  }
  return response.json();
}

export async function loginUser(name, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Login failed');
  }
  return response.json();
}

export async function fetchUsers() {
  const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

export async function createUser(name, bank) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, bank })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create user');
  }
  return response.json();
}

export async function deleteUser(userId) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete user');
  }
  return response.json();
}

export async function fetchExpenses() {
  const response = await fetch(`${API_URL}/expenses`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch expenses');
  return response.json();
}

export async function fetchSettlements() {
  const response = await fetch(`${API_URL}/settlements`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch settlements');
  return response.json();
}

export async function createExpense(expenseData) {
  const response = await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(expenseData)
  });
  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
}

export async function clearAllData() {
  const response = await fetch(`${API_URL}/expenses`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to clear data');
  return response.json();
}

export async function fetchPayments() {
  const response = await fetch(`${API_URL}/payments`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch payments');
  return response.json();
}

export async function initiatePhonePePayment(amount, settlementId) {
  const currentUrl = window.location.origin + window.location.pathname;
  const response = await fetch(`${API_URL}/phonepe/pay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount, settlementId, redirectUrl: currentUrl })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to initiate PhonePe payment');
  }
  return response.json();
}

export async function checkPaymentStatus(txnId) {
  const response = await fetch(`${API_URL}/phonepe/status/${txnId}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch payment status');
  return response.json();
}
