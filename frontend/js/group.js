requireAuth();

// Group id comes from the URL, e.g. group.html?id=abc123
const params = new URLSearchParams(window.location.search);
const groupId = params.get('id');
const currentUserId = getCurrentUserId();

if (!groupId) {
  window.location.href = 'dashboard.html';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let members = []; // cached so the expense form can build checkboxes without refetching

async function loadGroupDetail() {
  const group = await apiFetch(`/groups/${groupId}`);
  document.getElementById('groupName').textContent = group.name;
  members = group.members;

  document.getElementById('membersList').innerHTML = members
    .map(
      (m) => `
      <div class="member-item">
        <span>${escapeHtml(m.name)} ${m.id === currentUserId ? '(you)' : ''}</span>
        <span style="color: #999; font-size: 13px;">${m.role}</span>
      </div>
    `
    )
    .join('');

  // Build a checkbox per member for the "split equally between" field —
  // checked by default so the common case (split with everyone) needs no clicks.
  document.getElementById('participantsList').innerHTML = members
    .map(
      (m) => `
      <div class="checkbox-row">
        <input type="checkbox" id="participant-${m.id}" value="${m.id}" checked>
        <label for="participant-${m.id}" style="margin: 0;">${escapeHtml(m.name)}</label>
      </div>
    `
    )
    .join('');
}

async function loadBalances() {
  const balancesList = document.getElementById('balancesList');
  try {
    const balances = await apiFetch(`/groups/${groupId}/balances`);

    balancesList.innerHTML = balances
      .map((b) => {
        const net = parseFloat(b.net_balance);
        const label = net >= 0 ? `is owed ₹${net.toFixed(2)}` : `owes ₹${Math.abs(net).toFixed(2)}`;
        const cls = net >= 0 ? 'amount-positive' : 'amount-negative';
        return `
          <div class="balance-item">
            <span>${escapeHtml(b.name)} ${b.user_id === currentUserId ? '(you)' : ''}</span>
            <span class="${cls}">${label}</span>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    balancesList.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function loadSettlements() {
  const settlementsList = document.getElementById('settlementsList');
  try {
    const settlements = await apiFetch(`/groups/${groupId}/settlements`);

    if (settlements.length === 0) {
      settlementsList.innerHTML = '<div class="empty-state">Everyone is settled up 🎉</div>';
      return;
    }

    settlementsList.innerHTML = settlements
      .map(
        (s) => `
        <div class="balance-item">
          <span>${escapeHtml(s.fromName)} → ${escapeHtml(s.toName)}</span>
          <span class="amount-negative">₹${s.amount.toFixed(2)}</span>
          <button class="secondary" style="width: auto; margin: 0; padding: 6px 12px; font-size: 12px;"
            onclick="settleUp('${s.from}', '${s.to}', ${s.amount})">Mark Paid</button>
        </div>
      `
      )
      .join('');
  } catch (err) {
    settlementsList.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function loadExpenses() {
  const expensesList = document.getElementById('expensesList');
  try {
    const expenses = await apiFetch(`/groups/${groupId}/expenses`);

    if (expenses.length === 0) {
      expensesList.innerHTML = '<div class="empty-state">No expenses yet.</div>';
      return;
    }

    expensesList.innerHTML = expenses
      .map(
        (e) => `
        <div class="expense-item">
          <span>${escapeHtml(e.description)}</span>
          <span>₹${parseFloat(e.amount).toFixed(2)}</span>
        </div>
      `
      )
      .join('');
  } catch (err) {
    expensesList.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function refreshAll() {
  await Promise.all([loadBalances(), loadSettlements(), loadExpenses()]);
}

// Called from the "Mark Paid" button next to a suggested settlement.
async function settleUp(fromUser, toUser, amount) {
  try {
    await apiFetch(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify({ fromUser, toUser, amount }),
    });
    await refreshAll();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('addMemberBtn').addEventListener('click', async () => {
  const addMemberError = document.getElementById('addMemberError');
  addMemberError.classList.remove('visible');

  const email = document.getElementById('addMemberEmail').value.trim();
  if (!email) {
    addMemberError.textContent = 'Please enter an email';
    addMemberError.classList.add('visible');
    return;
  }

  const btn = document.getElementById('addMemberBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await apiFetch(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    document.getElementById('addMemberEmail').value = '';
    // Reload the whole group so the new member shows up everywhere —
    // in the members list AND as a checkbox option for future expenses.
    await loadGroupDetail();
  } catch (err) {
    addMemberError.textContent = err.message;
    addMemberError.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to Group';
  }
});

document.getElementById('addExpenseBtn').addEventListener('click', async () => {
  const expenseError = document.getElementById('expenseError');
  expenseError.classList.remove('visible');

  const description = document.getElementById('expenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);

  const selectedIds = members
    .map((m) => m.id)
    .filter((id) => document.getElementById(`participant-${id}`).checked);

  if (!description || !amount || amount <= 0) {
    expenseError.textContent = 'Please enter a description and a valid amount';
    expenseError.classList.add('visible');
    return;
  }
  if (selectedIds.length === 0) {
    expenseError.textContent = 'Select at least one person to split with';
    expenseError.classList.add('visible');
    return;
  }

  const btn = document.getElementById('addExpenseBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await apiFetch(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify({
        description,
        amount,
        splitType: 'equal',
        participants: selectedIds.map((id) => ({ userId: id })),
      }),
    });

    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    await refreshAll();
  } catch (err) {
    expenseError.textContent = err.message;
    expenseError.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Expense';
  }
});

async function init() {
  await loadGroupDetail();
  await refreshAll();
}

init();