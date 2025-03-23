// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
    throw new Error('Authentication required');
}

// Get current account ID and validate
const currentAccountId = localStorage.getItem('currentAccount');
if (!currentAccountId) {
    window.location.href = 'accounts.html';
    throw new Error('No account selected');
}

// Initialize data
try {
    // Get all accounts
    let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];
    
    // Find current account
    let currentAccount = accounts.find(acc => acc.id === currentAccountId);
    console.log('Current Account:', currentAccount); // Debug log
    
    if (!currentAccount) {
        console.error('Account not found:', currentAccountId);
        localStorage.removeItem('currentAccount'); // Clear invalid account
        window.location.href = 'accounts.html';
        throw new Error('Account not found');
    }

    // Get all transactions
    let allTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    let transactions = allTransactions.filter(t => t.accountId === currentAccountId);
    console.log('Transactions:', transactions); // Debug log

    // Currency setup with more accurate rates
    const currencyRates = {
        USD: 1,
        EUR: 0.85,
        AOA: 1.2, // Updated rate for better accuracy with Kwanza
        BRL: 4.91
    };

    // Format amount helper function - simplified without conversion
    function formatAmount(amount) {
        const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
        const numericAmount = Number(amount);
        
        if (isNaN(numericAmount)) {
            console.error('Invalid amount:', amount);
            return '0.00';
        }

        const symbols = {
            USD: '$',
            EUR: '€',
            AOA: 'Kz',
            BRL: 'R$'
        };

        return `${symbols[userCurrency]} ${numericAmount.toFixed(2)}`;
    }

    // Add categories loading
    const categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
        income: [],
        expense: []
    };

    // Add function to update category options based on transaction type
    function updateCategoryOptions(transactionType) {
        const incomeGroup = document.getElementById('incomeCategoryOptions');
        const expenseGroup = document.getElementById('expenseCategoryOptions');
        
        // Clear existing options
        incomeGroup.innerHTML = '';
        expenseGroup.innerHTML = '';
        
        // Add categories with icons
        categories.income.forEach(cat => {
            const option = new Option(cat.name, cat.id);
            option.dataset.icon = cat.icon;
            incomeGroup.appendChild(option);
        });
        
        categories.expense.forEach(cat => {
            const option = new Option(cat.name, cat.id);
            option.dataset.icon = cat.icon;
            expenseGroup.appendChild(option);
        });

        // Show/hide relevant category group
        incomeGroup.style.display = transactionType === 'income' ? '' : 'none';
        expenseGroup.style.display = transactionType === 'expense' ? '' : 'none';
    }

    // DOM Elements
    const modal = document.getElementById('transactionModal');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const accountInfo = document.getElementById('accountInfo');
    const transactionsList = document.getElementById('transactionsList');

    // Show/hide modal
    addTransactionBtn.onclick = () => modal.style.display = 'block';
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };

    // Render account info
    function renderAccountInfo() {
        accountInfo.innerHTML = `
            <h2>${currentAccount.name}</h2>
            <p>Type: ${currentAccount.type}</p>
            <div class="account-balance">${formatAmount(currentAccount.balance)}</div>
        `;
    }

    // Render transactions with delete button
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
                        <div class="transaction-category">${transaction.categoryName}</div>
                        <div class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</div>
                    </div>
                    <div class="transaction-actions">
                        <div class="transaction-amount ${transaction.type}">
                            ${formatAmount(transaction.amount)}
                        </div>
                        <button onclick="deleteTransaction('${transaction.id}')" class="btn-danger">Delete</button>
                    </div>
                </div>
            `).join('') || '<div class="no-transactions">No transactions yet</div>';
    }

    // Add delete transaction function
    function deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            // Find the transaction
            const transaction = transactions.find(t => t.id === transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Reverse the balance change
            const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
            currentAccount.balance = Number((currentAccount.balance + balanceChange).toFixed(2));

            // Remove transaction from arrays
            allTransactions = allTransactions.filter(t => t.id !== transactionId);
            transactions = allTransactions.filter(t => t.accountId === currentAccountId);

            // Update account balance in accounts array
            const accountIndex = accounts.findIndex(a => a.id === currentAccountId);
            accounts[accountIndex] = currentAccount;

            // Save changes to localStorage
            localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
            localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(allTransactions));

            // Update display
            renderAccountInfo();
            renderTransactions();

            alert('Transaction deleted successfully');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Failed to delete transaction. Please try again.');
        }
    }

    // Handle new transaction
    document.getElementById('addTransactionForm').addEventListener('submit', function(e) {
        e.preventDefault();

        try {
            const type = document.getElementById('transactionType').value;
            // Parse amount with 2 decimal precision
            const amount = parseFloat(document.getElementById('amount').value);
            const description = document.getElementById('description').value.trim();
            const categoryId = document.getElementById('category').value;
            const date = document.getElementById('date').value;

            if (!type || isNaN(amount) || !description || !categoryId || !date) {
                alert('Please fill all fields correctly');
                return;
            }

            // Validate amount
            if (amount <= 0) {
                alert('Amount must be greater than zero');
                return;
            }

            console.log('Processing amount:', amount); // Debug log

            // Find selected category
            const category = categories[type].find(c => c.id === categoryId);

            // Store original amount without currency conversion
            const newTransaction = {
                id: Date.now().toString(),
                accountId: currentAccountId,
                userId: currentUser.id,
                type,
                amount: amount, // Store original amount
                description,
                categoryId,
                categoryName: category.name,
                categoryIcon: category.icon,
                date,
                createdAt: new Date().toISOString()
            };

            // Update account balance using original amount
            const balanceChange = type === 'income' ? amount : -amount;
            currentAccount.balance = Number((currentAccount.balance + balanceChange).toFixed(2));

            // Update arrays
            const accountIndex = accounts.findIndex(a => a.id === currentAccountId);
            accounts[accountIndex] = currentAccount;
            
            allTransactions.push(newTransaction);
            transactions = allTransactions.filter(t => t.accountId === currentAccountId);

            // Save to localStorage
            localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
            localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(allTransactions));

            // Update budget tracking for expense transactions
            if (type === 'expense') {
                const budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
                if (budgets[categoryId]) {
                    // Budget exists for this category, no need to modify it
                    // The budget page will calculate spending based on transactions
                }
            }

            // Update display
            renderAccountInfo();
            renderTransactions();
            
            // Close modal and reset form
            modal.style.display = 'none';
            e.target.reset();

        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Failed to add transaction. Please try again.');
        }
    });

    // Initial render
    renderAccountInfo();
    renderTransactions();

    // Initial category options setup
    updateCategoryOptions('expense');

    // Add transaction type change handler
    document.getElementById('transactionType').addEventListener('change', function(e) {
        updateCategoryOptions(e.target.value);
    });

} catch (error) {
    console.error('Error:', error);
    localStorage.removeItem('currentAccount'); // Clear invalid account
    window.location.href = 'accounts.html';
}
