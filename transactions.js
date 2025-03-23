// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Get current account ID and validate
const currentAccountId = localStorage.getItem('currentAccount');
if (!currentAccountId) {
    window.location.href = 'accounts.html';
}

// Initialize data
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];
let currentAccount = accounts.find(acc => acc.id === currentAccountId);
let allTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
let transactions = allTransactions.filter(t => t.accountId === currentAccountId);
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
    income: [],
    expense: []
};

// DOM Elements
const modal = document.getElementById('transactionModal');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const closeModalBtn = document.getElementById('closeModal');
const accountInfo = document.getElementById('accountInfo');
const transactionsList = document.getElementById('transactionsList');

// Show/hide modal
addTransactionBtn.onclick = () => {
    modal.style.display = 'block';
    updateCategoryOptions('expense');
};
closeModalBtn.onclick = () => modal.style.display = 'none';

function updateCategoryOptions(transactionType) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '';
    
    categories[transactionType].forEach(cat => {
        const option = new Option(cat.name, cat.id);
        option.dataset.icon = cat.icon;
        categorySelect.appendChild(option);
    });
}

// Format amount
function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const symbols = { USD: '$', EUR: '€', AOA: 'Kz', BRL: 'R$' };
    return `${symbols[userCurrency]} ${Number(amount).toFixed(2)}`;
}

// Handle new transaction
document.getElementById('addTransactionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    try {
        const type = document.getElementById('transactionType').value;
        const amount = Math.abs(parseFloat(document.getElementById('amount').value));
        const description = document.getElementById('description').value.trim();
        const categoryId = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!type || isNaN(amount) || !description || !categoryId || !date) {
            alert('Please fill all fields correctly');
            return;
        }

        const category = categories[type].find(c => c.id === categoryId);
        
        const newTransaction = {
            id: Date.now().toString(),
            accountId: currentAccountId,
            userId: currentUser.id,
            type,
            amount,
            description,
            categoryId,
            categoryName: category.name,
            categoryIcon: category.icon,
            date,
            createdAt: new Date().toISOString()
        };

        // Update account balance
        const balanceChange = type === 'income' ? amount : -amount;
        currentAccount.balance = Number((currentAccount.balance + balanceChange).toFixed(2));
        accounts[accounts.findIndex(a => a.id === currentAccountId)] = currentAccount;
        
        // Update transactions
        allTransactions.push(newTransaction);
        transactions = allTransactions.filter(t => t.accountId === currentAccountId);

        // Save everything
        localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
        localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(allTransactions));

        // Update UI
        renderAccountInfo();
        renderTransactions();

        // Notify other pages
        window.dispatchEvent(new CustomEvent('transactionsUpdated', {
            detail: { userId: currentUser.id }
        }));

        // Reset form and close modal
        modal.style.display = 'none';
        this.reset();

    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to add transaction. Please try again.');
    }
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Render account info
function renderAccountInfo() {
    accountInfo.innerHTML = `
        <h2>${currentAccount.name}</h2>
        <p>Type: ${currentAccount.type}</p>
        <div class="account-balance">${formatAmount(currentAccount.balance)}</div>
    `;
}

// Render transactions
function renderTransactions() {
    transactionsList.innerHTML = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">
                        ${transaction.categoryIcon ? 
                          `<img src="${transaction.categoryIcon}" class="category-icon" alt="${transaction.categoryName}">` : 
                          ''}
                        ${transaction.description}
                    </div>
                    <div class="transaction-meta">
                        <span class="transaction-category">${transaction.categoryName}</span>
                        <span class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${formatAmount(transaction.amount)}
                </div>
            </div>
        `).join('') || '<div class="no-transactions">No transactions yet</div>';
}

// Initialize
document.getElementById('transactionType').addEventListener('change', function(e) {
    updateCategoryOptions(e.target.value);
});

renderAccountInfo();
renderTransactions();