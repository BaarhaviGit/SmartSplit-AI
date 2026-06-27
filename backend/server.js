const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

dotenv.config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5174', 'http://localhost:5173']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';
const PHONEPE_STATUS_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status';

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ---

app.post('/api/register', async (req, res) => {
  const { name, bank, password } = req.body;
  try {
    if (!name || !password) return res.status(400).json({ error: "Name and password are required" });

    // Check if user exists globally (simplification, though normally scoped)
    const existingUser = await db.get('SELECT * FROM users WHERE name = ?', [name]);
    if (existingUser) return res.status(400).json({ error: "Username already taken." });

    const groupId = uuidv4();
    const userId = uuidv4();
    
    // Create new Group
    await db.run('INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)', [groupId, `${name}'s Group`, userId]);
    
    // Hash password and create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.run('INSERT INTO users (id, group_id, name, password, bank) VALUES (?, ?, ?, ?, ?)', 
      [userId, groupId, name, hashedPassword, bank || '']);

    const token = jwt.sign({ id: userId, name, group_id: groupId }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: userId, name, bank, group_id: groupId } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    if (!name || !password) return res.status(400).json({ error: "Name and password are required" });

    const user = await db.get('SELECT * FROM users WHERE name = ?', [name]);
    if (!user) return res.status(400).json({ error: "Invalid credentials." });
    
    if (!user.password) {
      // For legacy users without password
      return res.status(400).json({ error: "Account does not have a password. Please register again." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials." });

    const token = jwt.sign({ id: user.id, name: user.name, group_id: user.group_id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, bank: user.bank, group_id: user.group_id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USERS CRUD ---

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, name, bank FROM users WHERE group_id = ? ORDER BY created_at ASC', [req.user.group_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { name, bank } = req.body;
  try {
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const existingUser = await db.get('SELECT * FROM users WHERE name = ? AND group_id = ?', [name, req.user.group_id]);
    if (existingUser) return res.status(400).json({ error: "User already exists in your group." });

    const id = uuidv4();
    await db.run('INSERT INTO users (id, group_id, name, bank) VALUES (?, ?, ?, ?)', [id, req.user.group_id, name, bank || '']);
    res.json({ id, name, bank, group_id: req.user.group_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent deleting self (founder)
    if (id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete yourself." });
    }

    const userToDelete = await db.get('SELECT * FROM users WHERE id = ? AND group_id = ?', [id, req.user.group_id]);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found in your group." });
    }

    const userName = userToDelete.name;

    // 1. Delete expenses where this user is the payer
    await db.run('DELETE FROM expenses WHERE payer = ? AND group_id = ?', [userName, req.user.group_id]);

    // 2. Fetch remaining expenses to remove user from participants array
    const remainingExpenses = await db.all('SELECT * FROM expenses WHERE group_id = ?', [req.user.group_id]);
    
    for (const exp of remainingExpenses) {
      let participants = JSON.parse(exp.participants);
      if (participants.includes(userName)) {
        participants = participants.filter(p => p !== userName);
        
        if (participants.length === 0) {
          // If no participants left, delete the expense
          await db.run('DELETE FROM expenses WHERE id = ? AND group_id = ?', [exp.id, req.user.group_id]);
        } else {
          // Otherwise, update the expense with the new participants array
          await db.run('UPDATE expenses SET participants = ? WHERE id = ? AND group_id = ?', 
            [JSON.stringify(participants), exp.id, req.user.group_id]);
        }
      }
    }

    // 3. Delete the user
    await db.run('DELETE FROM users WHERE id = ? AND group_id = ?', [id, req.user.group_id]);

    res.json({ success: true, deletedUserId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EXPENSES CRUD ---

app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at ASC', [req.user.group_id]);
    const expenses = rows.map(row => ({
      ...row,
      participants: JSON.parse(row.participants)
    }));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { description, amount, payer, participants } = req.body;
    const id = uuidv4();
    await db.run(
      'INSERT INTO expenses (id, group_id, description, amount, payer, participants) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.group_id, description, amount, payer, JSON.stringify(participants)]
    );
    res.json({ id, description, amount, payer, participants, group_id: req.user.group_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses', authenticateToken, async (req, res) => {
  try {
    // Only clear the logged in user's group
    await db.run('DELETE FROM expenses WHERE group_id = ?', [req.user.group_id]);
    await db.run('DELETE FROM payments WHERE group_id = ?', [req.user.group_id]);
    await db.run('DELETE FROM users WHERE group_id = ? AND id != ?', [req.user.group_id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SETTLEMENTS (Calculated on Backend) ---

app.get('/api/settlements', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at ASC', [req.user.group_id]);
    const expenses = rows.map(row => ({ ...row, participants: JSON.parse(row.participants) }));
    
    const graph = {}; 
    expenses.forEach(exp => {
      if (!exp.participants || exp.participants.length === 0) return;
      const splitAmount = exp.amount / exp.participants.length;
      const payer = exp.payer;
      exp.participants.forEach(participant => {
        if (participant !== payer) {
          if (!graph[participant]) graph[participant] = {};
          graph[participant][payer] = (graph[participant][payer] || 0) + splitAmount;
        }
      });
    });

    const settlements = [];
    const processedPairs = new Set();

    Object.keys(graph).forEach(debtor => {
      Object.keys(graph[debtor]).forEach(creditor => {
        const pairKey = [debtor, creditor].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const amountAowesB = graph[debtor][creditor] || 0;
        const amountBowesA = (graph[creditor] && graph[creditor][debtor]) || 0;
        const netAmount = amountAowesB - amountBowesA;

        if (netAmount > 0.01) {
          settlements.push({ id: `settle_${debtor}_${creditor}`, from: debtor, to: creditor, amount: Math.round(netAmount * 100) / 100, status: 'pending' });
        } else if (netAmount < -0.01) {
          settlements.push({ id: `settle_${creditor}_${debtor}`, from: creditor, to: debtor, amount: Math.round(Math.abs(netAmount) * 100) / 100, status: 'pending' });
        }
      });
    });
    
    res.json(settlements.sort((a, b) => b.amount - a.amount));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYMENTS ---

app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM payments WHERE status = "COMPLETED" AND group_id = ?', [req.user.group_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/phonepe/pay', authenticateToken, async (req, res) => {
  try {
    const { amount, settlementId, redirectUrl } = req.body;
    if (!amount || !settlementId || !redirectUrl) return res.status(400).json({ error: 'Missing required parameters' });

    const merchantTransactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await db.run(
      'INSERT INTO payments (id, group_id, settlement_id, amount, status) VALUES (?, ?, ?, ?, ?)',
      [merchantTransactionId, req.user.group_id, settlementId, amount, 'INITIATED']
    );

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: 'MUID' + Date.now(),
      amount: Math.round(amount * 100), 
      redirectUrl: `${redirectUrl}?txnId=${merchantTransactionId}&settlementId=${settlementId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${redirectUrl}?txnId=${merchantTransactionId}&settlementId=${settlementId}`,
      mobileNumber: '9999999999',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString('base64');
    
    const stringToSign = base64Payload + '/pg/v1/pay' + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256 + '###' + SALT_INDEX;

    const response = await axios.post(PHONEPE_URL, { request: base64Payload }, {
      headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum, 'accept': 'application/json' }
    });

    if (response.data && response.data.success) {
      res.json({ success: true, redirectUrl: response.data.data.instrumentResponse.redirectInfo.url, transactionId: merchantTransactionId });
    } else {
      res.status(400).json({ error: 'PhonePe API Error', details: response.data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/phonepe/status/:txnId', authenticateToken, async (req, res) => {
  try {
    const { txnId } = req.params;
    const stringToSign = `/pg/v1/status/${MERCHANT_ID}/${txnId}` + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256 + '###' + SALT_INDEX;

    const response = await axios.get(`${PHONEPE_STATUS_URL}/${MERCHANT_ID}/${txnId}`, {
      headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum, 'X-MERCHANT-ID': MERCHANT_ID, 'accept': 'application/json' }
    });

    if (response.data && response.data.success) {
      const newState = response.data.data.state; 
      await db.run('UPDATE payments SET status = ? WHERE id = ? AND group_id = ?', [newState, txnId, req.user.group_id]);
      res.json({ success: true, data: response.data.data });
    } else {
      res.status(400).json({ success: false, data: response.data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SmartSplit AI backend running on http://localhost:${PORT}`);
});
