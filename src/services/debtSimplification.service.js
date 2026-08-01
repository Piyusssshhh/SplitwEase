// Greedy debt simplification: given each person's net balance (positive =
// owed money, negative = owes money), compute the minimum-ish set of
// transactions to settle everyone up.
//
// Approach: repeatedly match the person owed the MOST with the person who
// owes the MOST. Settle the smaller of the two amounts between them —
// this guarantees at least one person is fully settled per transaction.
//
// Note: this greedy approach is NOT guaranteed to find the mathematically
// true minimum number of transactions in every case (that general problem
// is NP-hard — related to subset-sum partitioning). But it's very close to
// optimal in practice and is exactly what real apps like Splitwise use.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function simplifyDebts(balances) {
  // balances: [{ userId, name, netBalance }]
  // Work off a copy so we don't mutate the caller's data.
  const creditors = balances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({ ...b, netBalance: round2(b.netBalance) }));
  const debtors = balances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({ ...b, netBalance: round2(b.netBalance) }));

  const transactions = [];

  while (creditors.length > 0 && debtors.length > 0) {
    // Find max creditor and max debtor (by absolute value) — O(n) scan each round.
    // For small group sizes (typical for expense-splitting apps), this is
    // plenty fast; a heap-based version would improve this to O(n log n)
    // for very large groups.
    creditors.sort((a, b) => b.netBalance - a.netBalance);
    debtors.sort((a, b) => a.netBalance - b.netBalance); // most negative first

    const creditor = creditors[0];
    const debtor = debtors[0];

    const settleAmount = round2(Math.min(creditor.netBalance, -debtor.netBalance));

    transactions.push({
      from: debtor.userId,
      fromName: debtor.name,
      to: creditor.userId,
      toName: creditor.name,
      amount: settleAmount,
    });

    creditor.netBalance = round2(creditor.netBalance - settleAmount);
    debtor.netBalance = round2(debtor.netBalance + settleAmount);

    // Remove anyone who's now fully settled.
    if (creditor.netBalance <= 0.01) creditors.shift();
    if (debtor.netBalance >= -0.01) debtors.shift();
  }

  return transactions;
}

module.exports = { simplifyDebts };