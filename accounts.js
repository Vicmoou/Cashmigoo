// Check if user is logged in
const currentUser = localStorage.getItem('currentUser');
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
try {
    const themeManager = new ThemeManager();
    themeManager.initialize();
} catch (error) {
    console.error('Failed to initialize theme:', error);
}

// Initialize mobile utilities
try {
    const mobileUtils = new MobileUtils();
    mobileUtils.initialize();
} catch (error) {
    console.error('Failed to initialize mobile utilities:', error);
}

// Format amount based on the user's currency preference
function formatAmount(amount, includeSymbol = true) {
    amount = parseFloat(amount);
    const user = JSON.parse(localStorage.getItem('currentUser')) || {};
    const currency = user.currency || '$';
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    
    const formattedAmount = absoluteAmount.toFixed(2);
    
    if (includeSymbol) {
        return isNegative ? `-${currency} ${formattedAmount}` : `${currency} ${formattedAmount}`;
    } else {
        return isNegative ? `-${formattedAmount}` : formattedAmount;
    }
}

// Initialize accounts
let accounts = [];
function initializeAccounts() {
    const currentUserObj = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUserObj?.id || currentUser;
    const accountsData = localStorage.getItem(`accounts_${userId}`);
    
    if (accountsData) {
        try {
            accounts = JSON.parse(accountsData) || [];
        } catch (error) {
            console.error('Error parsing accounts:', error);
            accounts = [];
        }
    }
    
    console.log('Initialized accounts:', accounts);
    displayAccounts();
    updateTotalBalance();
}

// DOM elements for account management
const accountsList = document.getElementById('accountsList');
const noAccountsMessage = document.getElementById('noAccountsMessage');
const addAccountBtn = document.getElementById('addAccountBtn');
const addAccountModal = document.getElementById('addAccountModal');
const addAccountForm = document.getElementById('addAccountForm');
const editAccountId = document.getElementById('editAccountId');
const deleteAccountBtn = document.getElementById('deleteAccount');
const closeModalBtn = document.getElementById('closeModal');

// DOM elements for adjusting balance
const adjustBalanceModal = document.getElementById('adjustBalanceModal');
const adjustBalanceForm = document.getElementById('adjustBalanceForm');
const adjustAccountId = document.getElementById('adjustAccountId');
const closeAdjustModalBtn = document.getElementById('closeAdjustModal');

// DOM elements for transferring money
const transferModal = document.getElementById('transferModal');
const transferForm = document.getElementById('transferForm');
const fromAccountId = document.getElementById('fromAccountId');
const toAccountIdSelect = document.getElementById('toAccountId');
const closeTransferModalBtn = document.getElementById('closeTransferModal');

// Context menu elements
const contextMenu = document.getElementById('accountContextMenu');
const editAccountOption = document.getElementById('editAccountOption');
const adjustBalanceOption = document.getElementById('adjustBalanceOption');
const transferOption = document.getElementById('transferOption');
const deleteAccountOption = document.getElementById('deleteAccountOption');

// Display accounts
function displayAccounts() {
    // Clear previous accounts
    while (accountsList.firstChild && accountsList.firstChild !== noAccountsMessage) {
        accountsList.removeChild(accountsList.firstChild);
    }
    
    if (accounts.length === 0) {
        noAccountsMessage.style.display = 'flex';
        return;
    }
    
    noAccountsMessage.style.display = 'none';
    
    console.log('Displaying accounts with icons:', accounts);
    
    // Create account elements
    accounts.forEach(account => {
        const accountItem = document.createElement('div');
        accountItem.classList.add('account-item');
        
        // Add class based on account type
        if (['checking', 'savings', 'Bank', 'Wallet'].includes(account.type)) {
            accountItem.classList.add('cash');
        } else if (['credit', 'debt', 'loan', 'Visa'].includes(account.type)) {
            accountItem.classList.add('credit');
        } else if (account.type === 'investment') {
            accountItem.classList.add('investment');
        }
        
        accountItem.dataset.id = account.id;
        
        // Handle long press/right click for options menu
        accountItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, account.id);
        });
        
        accountItem.addEventListener('touchstart', handleTouchStart);
        accountItem.addEventListener('touchend', handleTouchEnd);
        
        let longPressTimer;
        function handleTouchStart(e) {
            longPressTimer = setTimeout(() => {
                showContextMenu(e, account.id);
            }, 500);
        }
        
        function handleTouchEnd() {
            clearTimeout(longPressTimer);
        }
        
        // Add click event to show options menu
        accountItem.addEventListener('click', () => {
            showAccountOptions(account.id);
        });
        
        const isPositive = account.balance >= 0;
        
        // Check if account has a custom icon
        const iconHtml = account.icon ? 
            `<img src="${account.icon}" class="account-icon-img" alt="${account.name}">` : 
            `<i class="fas ${getAccountIcon(account.type)}"></i>`;
        
        accountItem.innerHTML = `
            <div class="account-details">
                <div class="account-name">${account.name}</div>
                <div class="account-type">
                    <div class="account-icon">
                        ${iconHtml}
                    </div>
                    ${account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </div>
            </div>
            <div class="account-actions">
                <button class="account-action-btn transfer-btn" title="Transfer Money">
                    <i class="fas fa-exchange-alt"></i>
                </button>
                <div class="account-balance ${isPositive ? 'positive' : 'negative'}">
                    ${formatAmount(account.balance)}
                </div>
            </div>
        `;
        
        accountsList.insertBefore(accountItem, noAccountsMessage);
        
        // Add event listener to the transfer button
        const transferBtn = accountItem.querySelector('.transfer-btn');
        if (transferBtn) {
            transferBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the click from triggering the account options
                showTransferModal(account.id);
            });
        }
    });
}

// Get appropriate icon for account type
function getAccountIcon(type) {
    switch(type.toLowerCase()) {
        case 'checking':
        case 'savings':
        case 'bank':
            return 'fa-university';
        case 'wallet':
            return 'fa-wallet';
        case 'credit':
        case 'visa':
            return 'fa-credit-card';
        case 'investment':
            return 'fa-chart-line';
        case 'debt':
        case 'loan':
            return 'fa-hand-holding-usd';
        default:
            return 'fa-money-bill-wave';
    }
}

// Update total balance display
function updateTotalBalance() {
    const totalBalanceElement = document.getElementById('totalBalance');
    const cashBalanceElement = document.getElementById('cashBalance');
    const creditBalanceElement = document.getElementById('creditBalance');
    
    if (!totalBalanceElement || !cashBalanceElement || !creditBalanceElement) {
        console.error('Balance elements not found');
        return;
    }
    
    let totalBalance = 0;
    let cashBalance = 0;
    let creditBalance = 0;
    
    accounts.forEach(account => {
        totalBalance += parseFloat(account.balance);
        
        if (['checking', 'savings', 'Bank', 'Wallet'].includes(account.type)) {
            cashBalance += parseFloat(account.balance);
        } else if (['credit', 'debt', 'loan', 'Visa'].includes(account.type)) {
            creditBalance += parseFloat(account.balance);
        }
    });
    
    totalBalanceElement.textContent = formatAmount(totalBalance);
    cashBalanceElement.textContent = formatAmount(cashBalance);
    creditBalanceElement.textContent = formatAmount(creditBalance);
}

// Show context menu for account options
function showContextMenu(event, accountId) {
    // Set the active account
    contextMenu.dataset.accountId = accountId;
    
    // Position the context menu
    const x = event.type.includes('touch') ? event.touches[0].clientX : event.clientX;
    const y = event.type.includes('touch') ? event.touches[0].clientY : event.clientY;
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    // Show the context menu
    contextMenu.style.display = 'block';
    
    // Add click event to close the context menu when clicking outside
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('touchstart', hideContextMenu);
    
    event.stopPropagation();
}

function hideContextMenu(event) {
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
        document.removeEventListener('click', hideContextMenu);
        document.removeEventListener('touchstart', hideContextMenu);
    }
}

// Show account options modal
function showAccountOptions(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    editAccount(accountId);
}

// Add event listeners for context menu options
editAccountOption.addEventListener('click', () => {
    const accountId = contextMenu.dataset.accountId;
    if (accountId) {
        editAccount(accountId);
    }
    contextMenu.style.display = 'none';
});

adjustBalanceOption.addEventListener('click', () => {
    const accountId = contextMenu.dataset.accountId;
    if (accountId) {
        showAdjustBalanceModal(accountId);
    }
    contextMenu.style.display = 'none';
});

transferOption.addEventListener('click', () => {
    const accountId = contextMenu.dataset.accountId;
    if (accountId) {
        showTransferModal(accountId);
    }
    contextMenu.style.display = 'none';
});

deleteAccountOption.addEventListener('click', () => {
    const accountId = contextMenu.dataset.accountId;
    if (accountId) {
        confirmDeleteAccount(accountId);
    }
    contextMenu.style.display = 'none';
});

// Show modal to add a new account
function showAddAccountModal() {
    // Reset form
    addAccountForm.reset();
    editAccountId.value = '';
    
    // Change button text
    const submitButton = addAccountForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Save Account';
    
    // Hide delete button
    deleteAccountBtn.style.display = 'none';
    
    // Show modal
    addAccountModal.style.display = 'block';
}

// Edit existing account
function editAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Fill form with account data
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountType').value = account.type;
    document.getElementById('initialBalance').value = account.balance;
    editAccountId.value = accountId;
    
    // Change button text
    const submitButton = addAccountForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Account';
    
    // Show delete button
    deleteAccountBtn.style.display = 'block';
    
    // Show modal
    addAccountModal.style.display = 'block';
}

// Confirm delete account
function confirmDeleteAccount(accountId) {
    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        deleteAccount(accountId);
    }
}

// Delete account
function deleteAccount(accountId) {
    console.log('Deleting account with ID:', accountId);
    console.log('Accounts before deletion:', accounts);
    
    accounts = accounts.filter(account => account.id !== accountId);
    
    console.log('Accounts after deletion:', accounts);
    
    // Update local storage
    saveAccounts();
    
    // Update UI
    displayAccounts();
    updateTotalBalance();
    
    // Close modal if open
    addAccountModal.style.display = 'none';
}

// Show modal to adjust balance
function showAdjustBalanceModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    adjustAccountId.value = accountId;
    document.getElementById('adjustmentAmount').value = account.balance;
    
    adjustBalanceModal.style.display = 'block';
}

// Show modal to transfer money
function showTransferModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    fromAccountId.value = accountId;
    
    // Clear and populate to account dropdown
    toAccountIdSelect.innerHTML = '';
    accounts.forEach(acc => {
        if (acc.id !== accountId) {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.name} (${formatAmount(acc.balance)})`;
            toAccountIdSelect.appendChild(option);
        }
    });
    
    transferModal.style.display = 'block';
}

// Save accounts to local storage
function saveAccounts() {
    const currentUserObj = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUserObj?.id || currentUser;
    
    localStorage.setItem(`accounts_${userId}`, JSON.stringify(accounts));
    console.log('Saved accounts:', accounts);
    
    // Dispatch storage event to update other pages
    window.dispatchEvent(new CustomEvent('storage', {
        detail: {
            key: `accounts_${userId}`,
            newValue: JSON.stringify(accounts)
        }
    }));
}

// Event listeners
addAccountBtn.addEventListener('click', showAddAccountModal);
closeModalBtn.addEventListener('click', () => addAccountModal.style.display = 'none');
closeAdjustModalBtn.addEventListener('click', () => adjustBalanceModal.style.display = 'none');
closeTransferModalBtn.addEventListener('click', () => transferModal.style.display = 'none');
deleteAccountBtn.addEventListener('click', () => {
    const accountId = editAccountId.value;
    if (accountId) {
        console.log('Delete button clicked for account ID:', accountId);
        confirmDeleteAccount(accountId);
    } else {
        console.error('No account ID found for deletion');
    }
});

// Convert file to base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Form submissions
addAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountId = editAccountId.value;
    const name = document.getElementById('accountName').value;
    const type = document.getElementById('accountType').value;
    const balance = parseFloat(document.getElementById('initialBalance').value);
    const iconFile = document.getElementById('accountIcon').files[0];
    
    // Process icon if available
    let iconData = null;
    if (iconFile) {
        try {
            iconData = await convertToBase64(iconFile);
            console.log('Icon converted to base64');
        } catch (error) {
            console.error('Error converting icon:', error);
        }
    }
    
    if (accountId) {
        // Update existing account
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            account.name = name;
            account.type = type;
            
            // Update icon if a new one was uploaded
            if (iconData) {
                account.icon = iconData;
            }
            
            // Log transaction if balance changed
            if (account.balance !== balance) {
                const adjustmentAmount = balance - account.balance;
                const transaction = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    amount: adjustmentAmount,
                    fromAccount: accountId,
                    toAccount: null,
                    category: 'adjustment',
                    note: 'Account balance adjusted',
                    userId: currentUser
                };
                
                // Save transaction
                const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
                transactions.push(transaction);
                localStorage.setItem('transactions', JSON.stringify(transactions));
                
                // Update account balance
                account.balance = balance;
            }
        }
    } else {
        // Create new account
        const newAccount = {
            id: Date.now().toString(),
            name,
            type,
            balance,
            icon: iconData,
            userId: currentUser
        };
        
        accounts.push(newAccount);
        
        // Log initial balance transaction if not zero
        if (balance !== 0) {
            const transaction = {
                id: (Date.now() + 1).toString(),
                date: new Date().toISOString(),
                amount: balance,
                fromAccount: null,
                toAccount: newAccount.id,
                category: 'initial',
                note: 'Initial balance',
                userId: currentUser
            };
            
            // Save transaction
            const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }
    }
    
    // Save accounts and update UI
    saveAccounts();
    displayAccounts();
    updateTotalBalance();
    
    // Close modal
    addAccountModal.style.display = 'none';
});

adjustBalanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const accountId = adjustAccountId.value;
    const newBalance = parseFloat(document.getElementById('adjustmentAmount').value);
    const note = document.getElementById('adjustmentNote').value;
    const includeInReports = document.getElementById('adjustmentIncludeInReports').checked;
    
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
        // Calculate adjustment amount
        const adjustmentAmount = newBalance - account.balance;
        
        // Update account balance
        account.balance = newBalance;
        
        // Log transaction
        if (includeInReports) {
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                amount: adjustmentAmount,
                fromAccount: adjustmentAmount < 0 ? accountId : null,
                toAccount: adjustmentAmount > 0 ? accountId : null,
                category: 'adjustment',
                note,
                userId: currentUser
            };
            
            // Save transaction
            const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }
        
        // Save accounts and update UI
        saveAccounts();
        displayAccounts();
        updateTotalBalance();
    }
    
    // Close modal
    adjustBalanceModal.style.display = 'none';
});

transferForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const fromId = fromAccountId.value;
    const toId = document.getElementById('toAccountId').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const note = document.getElementById('transferNote').value;
    const includeInReports = document.getElementById('transferIncludeInReports').checked;
    
    if (amount <= 0) {
        alert('Transfer amount must be greater than zero.');
        return;
    }
    
    const fromAccount = accounts.find(acc => acc.id === fromId);
    const toAccount = accounts.find(acc => acc.id === toId);
    
    if (fromAccount && toAccount) {
        // Check if from account has sufficient balance
        if (fromAccount.balance < amount && !['credit', 'debt', 'loan'].includes(fromAccount.type)) {
            alert('Insufficient balance for transfer.');
            return;
        }
        
        // Update account balances
        fromAccount.balance -= amount;
        toAccount.balance += amount;
        
        // Log transaction
        if (includeInReports) {
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                amount,
                fromAccount: fromId,
                toAccount: toId,
                category: 'transfer',
                note,
                userId: currentUser
            };
            
            // Save transaction
            const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }
        
        // Save accounts and update UI
        saveAccounts();
        displayAccounts();
        updateTotalBalance();
    }
    
    // Close modal
    transferModal.style.display = 'none';
});

// Handle theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    try {
        const themeManager = new ThemeManager();
        themeManager.toggleTheme();
    } catch (error) {
        console.error('Failed to toggle theme:', error);
    }
});

// Handle add transaction button
document.getElementById('addTransactionBtn').addEventListener('click', () => {
    window.location.href = 'transactions.html';
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initializeAccounts();
});

// Listen for storage changes to refresh data
window.addEventListener('storage', () => {
    initializeAccounts();
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === addAccountModal) {
        addAccountModal.style.display = 'none';
    } else if (e.target === adjustBalanceModal) {
        adjustBalanceModal.style.display = 'none';
    } else if (e.target === transferModal) {
        transferModal.style.display = 'none';
    }
});

