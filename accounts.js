// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const numericAmount = Number(amount);
    
    const symbols = {
        USD: '$',
        EUR: '€',
        AOA: 'Kz',
        BRL: 'R$'
    };

    return `${symbols[userCurrency]} ${numericAmount.toFixed(2)}`;
}

// Initialize accounts
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];

// DOM elements
const modal = document.getElementById('addAccountModal');
const addAccountBtn = document.getElementById('addAccountBtn');
const closeModalBtn = document.getElementById('closeModal');
const accountsList = document.getElementById('accountsList');
const addAccountForm = document.getElementById('addAccountForm');

// Add DOM elements for adjust balance modal
const adjustBalanceModal = document.getElementById('adjustBalanceModal');
const closeAdjustModalBtn = document.getElementById('closeAdjustModal');
const adjustBalanceForm = document.getElementById('adjustBalanceForm');

// Show/hide modal
addAccountBtn.onclick = () => modal.style.display = 'block';
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Show/hide adjust balance modal
closeAdjustModalBtn.onclick = () => adjustBalanceModal.style.display = 'none';

// Show adjust balance modal
function showAdjustBalance(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    document.getElementById('adjustAccountId').value = accountId;
    document.getElementById('adjustmentAmount').value = account.balance;
    adjustBalanceModal.style.display = 'block';
}

// Handle account creation
addAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountName = document.getElementById('accountName').value;
    const accountType = document.getElementById('accountType').value;
    const initialBalance = parseFloat(document.getElementById('initialBalance').value);
    const iconFile = document.getElementById('accountIcon').files[0];
    
    let iconData = null;
    if (iconFile) {
        iconData = await convertImageToBase64(iconFile);
    }
    
    const newAccount = {
        id: Date.now().toString(),
        name: accountName,
        type: accountType,
        balance: initialBalance,
        icon: iconData,
        createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
    
    renderAccounts();
    modal.style.display = 'none';
    addAccountForm.reset();
});

// Handle balance adjustment
adjustBalanceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const accountId = document.getElementById('adjustAccountId').value;
    const newBalance = parseFloat(document.getElementById('adjustmentAmount').value);
    const note = document.getElementById('adjustmentNote').value;
    
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    // Calculate the adjustment amount
    const adjustment = newBalance - account.balance;
    
    // Create adjustment transaction
    const adjustmentTransaction = {
        id: Date.now().toString(),
        accountId: accountId,
        type: adjustment >= 0 ? 'income' : 'expense',
        amount: Math.abs(adjustment),
        description: `Balance adjustment: ${note}`,
        categoryId: 'adjustment',
        categoryName: 'Balance Adjustment',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    
    // Update account balance
    account.balance = newBalance;
    
    // Save changes
    localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
    
    // Add adjustment transaction
    const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    transactions.push(adjustmentTransaction);
    localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
    
    // Update display
    renderAccounts();
    adjustBalanceModal.style.display = 'none';
    adjustBalanceForm.reset();
});

// Convert image to base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Render accounts
function renderAccounts() {
    accountsList.innerHTML = accounts.map(account => `
        <div class="account-card">
            ${account.icon ? `<img src="${account.icon}" class="account-icon" alt="${account.name}">` : ''}
            <h3>${account.name}</h3>
            <p>Type: ${account.type}</p>
            <div class="account-balance">${formatAmount(account.balance)}</div>
            <div class="account-actions">
                <button onclick="viewTransactions('${account.id}')" class="btn-secondary">View Transactions</button>
                <button onclick="showAdjustBalance('${account.id}')" class="btn-primary">Adjust Balance</button>
                <button onclick="deleteAccount('${account.id}')" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add delete account function
function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
    }

    try {
        // Remove account
        accounts = accounts.filter(account => account.id !== accountId);
        localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));

        // Remove associated transactions
        const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
        const updatedTransactions = transactions.filter(t => t.accountId !== accountId);
        localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(updatedTransactions));

        // Refresh the display
        renderAccounts();
        
        alert('Account deleted successfully');
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
    }
}

// View transactions for an account
function viewTransactions(accountId) {
    try {
        // Verify account exists before navigation
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
            throw new Error('Account not found');
        }
        
        // Store account ID and navigate
        localStorage.setItem('currentAccount', accountId);
        window.location.href = 'transactions.html';
    } catch (error) {
        console.error('Error viewing transactions:', error);
        alert('Could not view transactions. Please try again.');
    }
}

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Initial render
renderAccounts();
