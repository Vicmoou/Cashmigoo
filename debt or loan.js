// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize debts/loans
let debts = JSON.parse(localStorage.getItem(`debts_${currentUser.id}`)) || [];

// DOM Elements
const debtModal = document.getElementById('debtModal');
const paymentModal = document.getElementById('paymentModal');
const addDebtBtn = document.getElementById('addDebtBtn');
const closeModalBtns = document.querySelectorAll('#closeModal, #closePaymentModal');
const debtList = document.getElementById('debtList');

// Show/hide modals
addDebtBtn.onclick = () => debtModal.style.display = 'block';
closeModalBtns.forEach(btn => {
    btn.onclick = () => {
        debtModal.style.display = 'none';
        paymentModal.style.display = 'none';
    }
});

// Format amount
function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const symbols = { USD: '$', EUR: '€', AOA: 'Kz', BRL: 'R$' };
    return `${symbols[userCurrency]} ${Number(amount).toFixed(2)}`;
}

// Calculate remaining balance
function calculateBalance(debt) {
    const totalPaid = (debt.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debt.amount - totalPaid;
    const progress = (totalPaid / debt.amount) * 100;
    return { remaining, progress };
}

// Calculate days remaining
function calculateDaysRemaining(dueDate) {
    const remaining = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return remaining > 0 ? remaining : 0;
}

// Handle new debt/loan submission
document.getElementById('addDebtForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const newDebt = {
        id: Date.now().toString(),
        name: document.getElementById('debtName').value,
        type: document.getElementById('debtType').value,
        amount: parseFloat(document.getElementById('amount').value),
        interestRate: parseFloat(document.getElementById('interestRate').value),
        startDate: document.getElementById('startDate').value,
        dueDate: document.getElementById('dueDate').value,
        payments: [],
        createdAt: new Date().toISOString()
    };

    debts.push(newDebt);
    localStorage.setItem(`debts_${currentUser.id}`, JSON.stringify(debts));
    
    renderDebts();
    debtModal.style.display = 'none';
    e.target.reset();
});

// Handle payment submission
document.getElementById('addPaymentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const debtId = this.dataset.debtId;
    const debt = debts.find(d => d.id === debtId);
    
    if (!debt) return;

    const payment = {
        id: Date.now().toString(),
        amount: parseFloat(document.getElementById('paymentAmount').value),
        date: document.getElementById('paymentDate').value
    };

    debt.payments = debt.payments || [];
    debt.payments.push(payment);
    
    localStorage.setItem(`debts_${currentUser.id}`, JSON.stringify(debts));
    
    renderDebts();
    paymentModal.style.display = 'none';
    e.target.reset();
});

// Show payment modal
function showPaymentModal(debtId) {
    const form = document.getElementById('addPaymentForm');
    form.dataset.debtId = debtId;
    paymentModal.style.display = 'block';
}

// Delete debt/loan
function deleteDebt(debtId) {
    if (!confirm('Are you sure you want to delete this debt/loan?')) return;
    
    debts = debts.filter(d => d.id !== debtId);
    localStorage.setItem(`debts_${currentUser.id}`, JSON.stringify(debts));
    renderDebts();
}

// Render debts/loans
function renderDebts() {
    debtList.innerHTML = debts.map(debt => {
        const { remaining, progress } = calculateBalance(debt);
        const daysRemaining = calculateDaysRemaining(debt.dueDate);
        
        return `
            <div class="debt-card">
                <h3>${debt.name}</h3>
                <div class="debt-info">
                    <div>
                        <span>Total Amount:</span>
                        <span>${formatAmount(debt.amount)}</span>
                    </div>
                    <div>
                        <span>Remaining:</span>
                        <span>${formatAmount(remaining)}</span>
                    </div>
                    <div>
                        <span>Interest Rate:</span>
                        <span>${debt.interestRate}%</span>
                    </div>
                    <div>
                        <span>Days Remaining:</span>
                        <span>${daysRemaining} days</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="debt-actions">
                    <button onclick="showPaymentModal('${debt.id}')" class="btn-primary">Add Payment</button>
                    <button onclick="deleteDebt('${debt.id}')" class="btn-danger">Delete</button>
                </div>
                <div class="payment-history">
                    <h4>Payment History</h4>
                    ${(debt.payments || []).map(payment => `
                        <div class="payment-item">
                            <span>${new Date(payment.date).toLocaleDateString()}</span>
                            <span>${formatAmount(payment.amount)}</span>
                        </div>
                    `).join('') || '<p>No payments yet</p>'}
                </div>
            </div>
        `;
    }).join('') || '<p>No debts or loans yet</p>';
}

// Initial render
renderDebts();
