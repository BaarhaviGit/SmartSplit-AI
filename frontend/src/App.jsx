import { useState, useEffect } from 'react';
import Ledger from './components/Ledger';
import SettleUp from './components/SettleUp';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import { 
  fetchExpenses, 
  createExpense, 
  clearAllData, 
  fetchPayments, 
  checkPaymentStatus,
  fetchUsers,
  createUser,
  fetchSettlements,
  deleteUser
} from './lib/paymentApi';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('smartsplit_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load Database state on mount
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        const usersData = await fetchUsers();
        const expensesData = await fetchExpenses();
        const settlementsData = await fetchSettlements();
        const paymentsData = await fetchPayments();
        
        setParticipants(usersData);
        setExpenses(expensesData);
        setSettlements(settlementsData);
        
        const paidMap = {};
        paymentsData.forEach(p => {
          paidMap[p.settlement_id] = true;
        });
        setPaidStatus(paidMap);
      } catch (error) {
        console.error("Error loading data from DB", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);

  // Handle PhonePe Redirect Return
  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const txnId = params.get('txnId');
    const settlementId = params.get('settlementId');

    if (txnId && settlementId) {
      setCurrentTab('expenses'); // Jump to expenses tab after redirect
      checkPaymentStatus(txnId)
        .then(res => {
          if (res.success && res.data && res.data.state === 'COMPLETED') {
            setPaidStatus(prev => ({ ...prev, [settlementId]: true }));
          } else {
            alert(`Payment status: ${res.data ? res.data.state : 'FAILED'}`);
          }
        })
        .catch(err => {
          console.error(err);
          alert(`Payment verification failed: ${err.message}`);
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [currentUser]);

  const handleAddUser = async (name) => {
    try {
      const newUser = await createUser(name, '');
      setParticipants(prev => [...prev, newUser]);
    } catch (err) {
      alert("Failed to add user: " + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? Their expenses will be cleaned up.')) return;
    try {
      await deleteUser(userId);
      // Reload all data to refresh expenses, participants and settlements
      const usersData = await fetchUsers();
      const expensesData = await fetchExpenses();
      const settlementsData = await fetchSettlements();
      setParticipants(usersData);
      setExpenses(expensesData);
      setSettlements(settlementsData);
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const addExpense = async (expense) => {
    try {
      const newExp = await createExpense(expense);
      setExpenses(prev => [...prev, newExp]);
      
      // refresh settlements from backend since it changed
      const updatedSettlements = await fetchSettlements();
      setSettlements(updatedSettlements);
    } catch (err) {
      alert("Failed to save expense: " + err.message);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to completely clear the database for your group?')) {
      try {
        await clearAllData();
        setExpenses([]);
        setSettlements([]);
        setPaidStatus({});
        setParticipants([]);
        
        // The backend deleted everyone except current user, so fetch again
        const usersData = await fetchUsers();
        setParticipants(usersData);
      } catch (err) {
        alert("Failed to clear database: " + err.message);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartsplit_current_user');
    localStorage.removeItem('smartsplit_token');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Onboarding onComplete={(user) => {
      setCurrentUser(user);
      setIsLoading(true);
    }} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#111' }}>
        <h2>Loading Ledger...</h2>
      </div>
    );
  }

  const participantNames = participants.map(p => p.name);

  return (
    <div className="layout-wrapper">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        handleLogout={handleLogout} 
      />
      
      <main className="layout-main">
        {/* Dynamic Background Effects */}
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>

        <div className="content-container">
          {currentTab === 'dashboard' && (
            <DashboardOverview currentUser={currentUser} expenses={expenses} settlements={settlements} />
          )}

          {currentTab === 'expenses' && (
            <>
              <div className="expenses-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h1 style={{margin: 0, fontSize: '32px'}}>Expenses</h1>
                <button className="btn-secondary" onClick={handleClear}>Reset Ledger</button>
              </div>
              <div className="grid-layout">
                <div className="column-left">
                  <UserManagement 
                    users={participants} 
                    currentUser={currentUser}
                    onAddUser={handleAddUser} 
                    onDeleteUser={handleDeleteUser}
                  />
                  <Ledger 
                    expenses={expenses} 
                    addExpense={addExpense} 
                    participants={participantNames} 
                  />
                </div>
                <div className="column-right">
                  <Analytics 
                    expenses={expenses} 
                  />
                  <SettleUp settlements={settlements} paidStatus={paidStatus} currentUser={currentUser} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
