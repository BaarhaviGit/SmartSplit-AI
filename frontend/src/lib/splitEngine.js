export function calculateSettlements(expenses) {
  // graph[debtor][creditor] = amount
  const graph = {}; 
  
  // Build graph of raw debts
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

  // Net them out
  const settlements = [];
  const processedPairs = new Set();

  Object.keys(graph).forEach(debtor => {
    Object.keys(graph[debtor]).forEach(creditor => {
      // Create a unique key for the pair regardless of direction
      const pairKey = [debtor, creditor].sort().join('-');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const amountAowesB = graph[debtor][creditor] || 0;
      const amountBowesA = (graph[creditor] && graph[creditor][debtor]) || 0;

      const netAmount = amountAowesB - amountBowesA;

      if (netAmount > 0.01) {
        // A owes B
        settlements.push({
          id: `settle_${debtor}_${creditor}`,
          from: debtor,
          to: creditor,
          amount: Math.round(netAmount * 100) / 100,
          status: 'pending'
        });
      } else if (netAmount < -0.01) {
        // B owes A
        settlements.push({
          id: `settle_${creditor}_${debtor}`,
          from: creditor,
          to: debtor,
          amount: Math.round(Math.abs(netAmount) * 100) / 100,
          status: 'pending'
        });
      }
    });
  });

  // Sort by highest amount first
  return settlements.sort((a, b) => b.amount - a.amount);
}
