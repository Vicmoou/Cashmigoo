// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
    throw new Error('Authentication required');
}

// Initialize theme
try {
    if (typeof ThemeManager !== 'undefined') {
        ThemeManager.init();
        console.log('Theme initialized');
    } else {
        console.error('ThemeManager is not defined. Make sure theme.js is loaded correctly.');
    }
} catch (error) {
    console.error('Error initializing theme:', error);
}

// Get data from localStorage
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];
let transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || { income: [], expense: [] };

// Format amounts with currency symbol
function formatAmount(amount, includeSymbol = true) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const numericAmount = Number(amount);
    
    const symbols = {
        USD: '$',
        EUR: '€',
        AOA: 'Kz',
        BRL: 'R$'
    };

    const symbol = symbols[userCurrency] || '$';
    
    if (includeSymbol) {
        return `${symbol} ${Math.abs(numericAmount).toFixed(2)}`;
    } else {
        return Math.abs(numericAmount).toFixed(2);
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Show transaction details
function showTransactionDetails(transaction) {
    const modal = document.getElementById('transactionDetailsModal');
    const detailsContainer = document.getElementById('transactionDetails');
    
    // Find account and category information
    const account = accounts.find(acc => acc.id === transaction.accountId) || { name: 'Unknown' };
    
    let categoryName = 'N/A';
    if (transaction.categoryId) {
        const category = categories[transaction.type === 'income' ? 'income' : 'expense'].find(cat => cat.id === transaction.categoryId);
        if (category) categoryName = category.name;
    }
    
    // Handle transfer transactions
    let transferDetails = '';
    if (transaction.isTransfer) {
        if (transaction.toAccountId) {
            const toAccount = accounts.find(acc => acc.id === transaction.toAccountId);
            transferDetails = `<div class="detail-row">
                <div class="detail-label">To Account</div>
                <div class="detail-value">${toAccount ? toAccount.name : 'Unknown'}</div>
            </div>`;
        } else if (transaction.fromAccountId) {
            const fromAccount = accounts.find(acc => acc.id === transaction.fromAccountId);
            transferDetails = `<div class="detail-row">
                <div class="detail-label">From Account</div>
                <div class="detail-value">${fromAccount ? fromAccount.name : 'Unknown'}</div>
            </div>`;
        }
    }
    
    // Build HTML for details
    let detailsHTML = `
        <div class="detail-row">
            <div class="detail-label">Date</div>
            <div class="detail-value">${formatDate(transaction.date)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Type</div>
            <div class="detail-value">${transaction.isTransfer ? 'Transfer' : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Amount</div>
            <div class="detail-value">${formatAmount(Math.abs(transaction.amount))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Account</div>
            <div class="detail-value">${account.name}</div>
        </div>
        ${transferDetails}
        ${!transaction.isTransfer ? `
        <div class="detail-row">
            <div class="detail-label">Category</div>
            <div class="detail-value">${categoryName}</div>
        </div>` : ''}
        <div class="detail-row">
            <div class="detail-label">Description</div>
            <div class="detail-value">${transaction.description}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Include in Reports</div>
            <div class="detail-value">${transaction.includeInReports !== false ? 'Yes' : 'No'}</div>
        </div>
    `;
    
    detailsContainer.innerHTML = detailsHTML;
    
    // Set up delete button
    const deleteBtn = document.getElementById('deleteTransactionBtn');
    deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this transaction? This cannot be undone.')) {
            deleteTransaction(transaction.id);
            modal.style.display = 'none';
        }
    };
    
    // Set up close buttons
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const closeDetailsModalBtn = document.getElementById('closeDetailsModal');
    
    closeDetailsBtn.onclick = () => modal.style.display = 'none';
    closeDetailsModalBtn.onclick = () => modal.style.display = 'none';
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Delete transaction
function deleteTransaction(transactionId) {
    // Find the transaction
    const index = transactions.findIndex(tx => tx.id === transactionId);
    if (index === -1) return;
    
    const transaction = transactions[index];
    
    // Update account balance
    if (transaction.accountId) {
        const account = accounts.find(acc => acc.id === transaction.accountId);
        if (account) {
            // For expense, add the amount back (it's negative)
            // For income, subtract the amount
            account.balance -= transaction.amount;
            
            // Update accounts in localStorage
            localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
        }
    }
    
    // If it's a transfer, also update the other account
    if (transaction.isTransfer) {
        // Handle the other side of the transfer
        const otherTxIndex = transactions.findIndex(tx => 
            (tx.fromAccountId === transaction.accountId && tx.accountId === transaction.toAccountId) ||
            (tx.toAccountId === transaction.accountId && tx.accountId === transaction.fromAccountId));
        
        if (otherTxIndex !== -1) {
            const otherTx = transactions[otherTxIndex];
            
            // Update the other account's balance
            const otherAccount = accounts.find(acc => acc.id === otherTx.accountId);
            if (otherAccount) {
                otherAccount.balance -= otherTx.amount;
            }
            
            // Remove the other transaction
            transactions.splice(otherTxIndex > index ? otherTxIndex - 1 : otherTxIndex, 1);
        }
    }
    
    // Remove the transaction
    transactions.splice(index, 1);
    
    // Update transactions in localStorage
    localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
    
    // Refresh the list
    displayTransactions();
    
    // Show notification
    alert('Transaction deleted successfully');
}

// Display transactions
function displayTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    const noTransactionsData = document.getElementById('noTransactionsData');
    
    // Get filter values
    const accountFilter = document.getElementById('accountFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    // Filter transactions
    let filteredTransactions = [...transactions];
    
    // Account filter
    if (accountFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.accountId === accountFilter);
    }
    
    // Date filter
    if (dateFilter) {
        filteredTransactions = filteredTransactions.filter(tx => tx.date === dateFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
        if (typeFilter === 'transfer') {
            filteredTransactions = filteredTransactions.filter(tx => tx.isTransfer);
        } else {
            filteredTransactions = filteredTransactions.filter(tx => tx.type === typeFilter && !tx.isTransfer);
        }
    }
    
    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Show empty state if no transactions
    if (filteredTransactions.length === 0) {
        if (noTransactionsData) noTransactionsData.style.display = 'block';
        transactionsList.innerHTML = '';
        return;
    } else {
        if (noTransactionsData) noTransactionsData.style.display = 'none';
    }
    
    // Generate HTML for transactions
    let transactionsHTML = '';
    
    filteredTransactions.forEach(transaction => {
        // Find account info
        const account = accounts.find(acc => acc.id === transaction.accountId) || { name: 'Unknown' };
        
        // Determine transaction type for styling
        let typeClass = transaction.isTransfer ? 'transfer' : transaction.type;
        
        transactionsHTML += `
            <div class="transaction-item ${typeClass}" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-details">
                        <span>${formatDate(transaction.date)}</span>
                        <span>${account.name}</span>
                    </div>
                </div>
                <div class="transaction-amount ${typeClass}">
                    ${transaction.type === 'expense' ? '-' : ''}${formatAmount(Math.abs(transaction.amount))}
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = transactionsHTML;
    
    // Add click handlers to transaction items
    document.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', () => {
            const transactionId = item.dataset.id;
            const transaction = transactions.find(tx => tx.id === transactionId);
            if (transaction) {
                showTransactionDetails(transaction);
            }
        });
    });
}

// Populate account filter dropdown
function populateAccountFilter() {
    const accountFilter = document.getElementById('accountFilter');
    
    accounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        accountFilter.appendChild(option);
    });
}

// Function to open the transaction modal and initialize form
function openTransactionModal() {
    const modal = document.getElementById('transactionModal');
    const transactionTypeSelect = document.getElementById('transactionType');
    const categorySelect = document.getElementById('category');
    const accountSelect = document.getElementById('transactionAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const dateInput = document.getElementById('date');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelTransaction');
    const categoryGroup = document.getElementById('categoryGroup');
    const toAccountGroup = document.getElementById('toAccountGroup');
    
    // Set today's date as default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    
    // Clear form fields
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('includeInReports').checked = true;
    
    // Populate accounts dropdown
    populateAccountsDropdown(accountSelect);
    populateAccountsDropdown(toAccountSelect, true); // Exclude current account
    
    // Populate categories based on transaction type
    populateCategories(transactionTypeSelect.value);
    
    // Add change listener for transaction type
    transactionTypeSelect.addEventListener('change', function() {
        const type = this.value;
        populateCategories(type);
        
        // Show/hide fields based on transaction type
        if (type === 'transfer') {
            categoryGroup.style.display = 'none';
            toAccountGroup.style.display = 'block';
        } else {
            categoryGroup.style.display = 'block';
            toAccountGroup.style.display = 'none';
        }
    });
    
    // Add change listener for from account to update to account options
    accountSelect.addEventListener('change', function() {
        populateAccountsDropdown(toAccountSelect, true);
    });
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close modal handlers
    function closeModal() {
        modal.style.display = 'none';
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Populate accounts dropdown
function populateAccountsDropdown(selectElement, excludeSelected = false) {
    // Save current selection
    const currentSelectedId = selectElement.value;
    
    // Get the ID to exclude (if we're populating the toAccount dropdown)
    const excludeId = excludeSelected ? document.getElementById('transactionAccount').value : null;
    
    selectElement.innerHTML = '';
    
    // Filter accounts if needed
    let accountsToShow = accounts;
    if (excludeId) {
        accountsToShow = accounts.filter(account => account.id !== excludeId);
    }
    
    accountsToShow.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        selectElement.appendChild(option);
    });
    
    // Try to restore previous selection if it exists and is valid
    if (currentSelectedId && accountsToShow.some(acc => acc.id === currentSelectedId)) {
        selectElement.value = currentSelectedId;
    }
    
    // Select first account as default if available
    if (accountsToShow.length > 0 && !selectElement.value) {
        selectElement.value = accountsToShow[0].id;
    }
}

// Populate categories dropdown based on transaction type
function populateCategories(transactionType) {
    const incomeOptions = document.getElementById('incomeCategoryOptions');
    const expenseOptions = document.getElementById('expenseCategoryOptions');
    const categorySelect = document.getElementById('category');
    
    // Clear existing options
    incomeOptions.innerHTML = '';
    expenseOptions.innerHTML = '';
    
    // Populate income categories
    categories.income.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        incomeOptions.appendChild(option);
    });
    
    // Populate expense categories
    categories.expense.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        expenseOptions.appendChild(option);
    });
    
    // Show/hide appropriate optgroups
    incomeOptions.parentNode.style.display = transactionType === 'income' ? 'block' : 'none';
    expenseOptions.parentNode.style.display = transactionType === 'expense' ? 'block' : 'none';
    
    // Set default selected category
    if (transactionType === 'income' && categories.income.length > 0) {
        categorySelect.value = categories.income[0].id;
    } else if (transactionType === 'expense' && categories.expense.length > 0) {
        categorySelect.value = categories.expense[0].id;
    }
}

// Handle save transaction button click
function handleSaveTransaction(e) {
    e.preventDefault();
    
    console.log('Save Transaction button clicked');
    
    // Get the status element
    const statusElement = document.getElementById('transactionStatus');
    const statusMessage = statusElement.querySelector('.status-message');
    const saveTransactionBtn = document.getElementById('saveTransaction');
    
    // Show loading state
    saveTransactionBtn.disabled = true;
    saveTransactionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    statusElement.style.display = 'block';
    statusMessage.textContent = 'Processing transaction...';
    statusMessage.style.color = '#4b5563';
    
    // Get form values
    const transactionType = document.getElementById('transactionType').value;
    const accountId = document.getElementById('transactionAccount').value;
    const amountInput = document.getElementById('amount');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const includeInReports = document.getElementById('includeInReports').checked;
    
    // Validate amount
    if (!amountInput.value || isNaN(parseFloat(amountInput.value)) || parseFloat(amountInput.value) <= 0) {
        showError('Please enter a valid amount greater than 0');
        amountInput.focus();
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    
    // Validate description
    if (!descriptionInput.value.trim()) {
        showError('Please enter a description');
        descriptionInput.focus();
        return;
    }
    
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    
    // Find selected account
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        showError('Please select a valid account');
        return;
    }
    
    try {
        // Handle different transaction types
        if (transactionType === 'transfer') {
            const toAccountId = document.getElementById('toAccount').value;
            
            if (accountId === toAccountId) {
                showError('Please select different accounts for transfer');
                return;
            }
            
            const toAccount = accounts.find(acc => acc.id === toAccountId);
            if (!toAccount) {
                showError('Please select a valid destination account');
                return;
            }
            
            // Create transfer transactions (one for withdrawal, one for deposit)
            const withdrawalTransaction = {
                id: Date.now().toString(),
                type: 'expense',
                amount: -amount,
                description: `Transfer to ${toAccount.name}: ${description}`,
                date: date,
                accountId: accountId,
                toAccountId: toAccountId,
                isTransfer: true,
                includeInReports: includeInReports
            };
            
            const depositTransaction = {
                id: (Date.now() + 1).toString(),
                type: 'income',
                amount: amount,
                description: `Transfer from ${account.name}: ${description}`,
                date: date,
                accountId: toAccountId,
                fromAccountId: accountId,
                isTransfer: true,
                includeInReports: includeInReports
            };
            
            // Update account balances
            account.balance -= amount;
            toAccount.balance += amount;
            
            // Save updated accounts and transactions
            accounts = accounts.map(acc => {
                if (acc.id === account.id) return account;
                if (acc.id === toAccount.id) return toAccount;
                return acc;
            });
            
            transactions.push(withdrawalTransaction, depositTransaction);
            console.log('Transfer transaction completed:', { withdrawalTransaction, depositTransaction });
            
        } else {
            // Regular income or expense transaction
            const categoryId = document.getElementById('category').value;
            
            // Find selected category
            const category = transactionType === 'income' 
                ? categories.income.find(cat => cat.id === categoryId)
                : categories.expense.find(cat => cat.id === categoryId);
            
            if (!category) {
                showError('Please select a valid category');
                return;
            }
            
            // Create transaction object
            const transaction = {
                id: Date.now().toString(),
                type: transactionType,
                amount: transactionType === 'income' ? amount : -amount,
                description: description,
                date: date,
                accountId: accountId,
                categoryId: categoryId,
                categoryName: category.name,
                includeInReports: includeInReports
            };
            
            // Update account balance
            account.balance += transactionType === 'income' ? amount : -amount;
            
            // Save updated account and transaction
            accounts = accounts.map(acc => acc.id === account.id ? account : acc);
            transactions.push(transaction);
            console.log('Regular transaction completed:', transaction);
        }
        
        // Update localStorage
        localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
        localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
        
        console.log('Data saved to localStorage');
        
        // Show success
        statusMessage.textContent = 'Transaction saved successfully!';
        statusMessage.style.color = '#10b981';
        
        // Refresh transactions list
        displayTransactions();
        
        // Close modal after a short delay
        setTimeout(() => {
            document.getElementById('transactionModal').style.display = 'none';
            
            // Reset form
            document.getElementById('addTransactionForm').reset();
            
            // Reset button
            saveTransactionBtn.disabled = false;
            saveTransactionBtn.textContent = 'Save Transaction';
            statusElement.style.display = 'none';
        }, 1500);
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        showError('Error saving transaction: ' + error.message);
    }
    
    function showError(message) {
        statusMessage.textContent = message;
        statusMessage.style.color = '#ef4444';
        statusElement.style.display = 'block';
        
        // Reset button
        saveTransactionBtn.disabled = false;
        saveTransactionBtn.textContent = 'Save Transaction';
        
        // Hide error after 3 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Transactions page loaded');
    
    // Set up event listeners
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const addFirstTransactionBtn = document.getElementById('addFirstTransactionBtn');
    const saveTransactionBtn = document.getElementById('saveTransaction');
    const clearDateFilterBtn = document.getElementById('clearDateFilter');
    
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', openTransactionModal);
    }
    
    if (addFirstTransactionBtn) {
        addFirstTransactionBtn.addEventListener('click', openTransactionModal);
    }
    
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', handleSaveTransaction);
    }
    
    if (clearDateFilterBtn) {
        clearDateFilterBtn.addEventListener('click', function() {
            document.getElementById('dateFilter').value = '';
            displayTransactions();
        });
    }
    
    // Set up filter change events
    const accountFilter = document.getElementById('accountFilter');
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (accountFilter) accountFilter.addEventListener('change', displayTransactions);
    if (dateFilter) dateFilter.addEventListener('change', displayTransactions);
    if (typeFilter) typeFilter.addEventListener('change', displayTransactions);
    
    // Populate account filter
    populateAccountFilter();
    
    // Display transactions
    displayTransactions();
    
    // Set up theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem(`theme_${currentUser.id}`, newTheme);
            
            themeToggle.innerHTML = newTheme === 'dark' ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        });
    }
});