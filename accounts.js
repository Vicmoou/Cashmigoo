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

// Add new DOM elements for transfer modal
const transferModal = document.getElementById('transferModal');
const closeTransferBtn = document.getElementById('closeTransferModal');
const transferForm = document.getElementById('transferForm');

// Show/hide modal
addAccountBtn.onclick = () => modal.style.display = 'block';
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Show/hide adjust balance modal
closeAdjustModalBtn.onclick = () => adjustBalanceModal.style.display = 'none';

// Show/hide transfer modal
closeTransferBtn.onclick = () => transferModal.style.display = 'none';

// Show adjust balance modal
function showAdjustBalance(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    document.getElementById('adjustAccountId').value = accountId;
    document.getElementById('adjustmentAmount').value = account.balance;
    adjustBalanceModal.style.display = 'block';
}

// Show transfer modal and populate accounts
function showTransfer(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
        alert('Account not found');
        return;
    }
    
    document.getElementById('fromAccountId').value = accountId;
    
    // Populate destination account dropdown
    const toAccountSelect = document.getElementById('toAccountId');
    const otherAccounts = accounts.filter(a => a.id !== accountId);
    
    if (otherAccounts.length === 0) {
        alert('No other accounts available for transfer');
        return;
    }
    
    toAccountSelect.innerHTML = otherAccounts
        .map(a => `<option value="${a.id}">${a.name} (${formatAmount(a.balance)})</option>`)
        .join('');
        
    transferModal.style.display = 'block';
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
    const includeInReports = document.getElementById('adjustmentIncludeInReports').checked || false;
    
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    // Calculate the adjustment amount
    const adjustment = newBalance - account.balance;
    
    // Create adjustment transaction
    const adjustmentTransaction = {
        id: Date.now().toString(),
        accountId: accountId,
        userId: currentUser.id,
        type: adjustment > 0 ? 'income' : 'expense',
        amount: Math.abs(adjustment),
        description: `Balance adjustment: ${note}`,
        categoryId: 'adjustment',
        categoryName: 'Balance Adjustment',
        date: new Date().toISOString().split('T')[0],
        includeInReports,
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
    
    // Update display and notify other pages
    renderAccounts();
    adjustBalanceModal.style.display = 'none';
    adjustBalanceForm.reset();
    window.dispatchEvent(new CustomEvent('transactionsUpdated'));
});

// Handle transfer submission
transferForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const fromAccountId = document.getElementById('fromAccountId').value;
    const toAccountId = document.getElementById('toAccountId').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const note = document.getElementById('transferNote').value;
    const includeInReports = document.getElementById('transferIncludeInReports').checked || false;
    
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    
    if (!fromAccount || !toAccount || amount <= 0 || fromAccount.balance < amount) {
        alert('Invalid transfer. Please check the amount and try again.');
        return;
    }
    
    // Create transfer transactions
    const transferOut = {
        id: Date.now().toString(),
        accountId: fromAccountId,
        userId: currentUser.id,
        type: 'expense',
        amount: amount,
        description: `Transfer to ${toAccount.name}: ${note}`,
        categoryId: 'transfer',
        categoryName: 'Transfer',
        date: new Date().toISOString().split('T')[0],
        includeInReports,
        createdAt: new Date().toISOString()
    };
    
    const transferIn = {
        id: (Date.now() + 1).toString(),
        accountId: toAccountId,
        userId: currentUser.id,
        type: 'income',
        amount: amount,
        description: `Transfer from ${fromAccount.name}: ${note}`,
        categoryId: 'transfer',
        categoryName: 'Transfer',
        date: new Date().toISOString().split('T')[0],
        includeInReports,
        createdAt: new Date().toISOString()
    };
    
    // Update account balances
    fromAccount.balance -= amount;
    toAccount.balance += amount;
    
    // Save all changes
    const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    transactions.push(transferOut, transferIn);
    
    localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
    localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
    
    // Update display
    renderAccounts();
    transferModal.style.display = 'none';
    this.reset();
    
    // Notify other pages
    window.dispatchEvent(new CustomEvent('transactionsUpdated'));
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
                <button onclick="toggleMenu('${account.id}')" class="menu-trigger">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div id="menu-${account.id}" class="dropdown-menu">
                    <button onclick="viewTransactions('${account.id}')" class="menu-item">
                        <i class="fas fa-list-ul"></i>
                        <span>Transactions</span>
                    </button>
                    <button onclick="showAdjustBalance('${account.id}')" class="menu-item">
                        <i class="fas fa-pencil-alt"></i>
                        <span>Adjust</span>
                    </button>
                    <button onclick="showTransfer('${account.id}')" class="menu-item">
                        <i class="fas fa-exchange-alt"></i>
                        <span>Transfer</span>
                    </button>
                    <button onclick="deleteAccount('${account.id}')" class="menu-item delete">
                        <i class="fas fa-trash-alt"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Add menu toggle functionality
function toggleMenu(accountId) {
    const menu = document.getElementById(`menu-${accountId}`);
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.matches('.menu-trigger, .menu-trigger *')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

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
