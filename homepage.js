// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
    throw new Error('Authentication required');
}

// Initialize theme
ThemeManager.init();

// Initialize budget data if not exists
if (!localStorage.getItem(`budgets_${currentUser.id}`)) {
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify({}));
}

// Get user's preferred currency or default to USD
let currentCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
document.getElementById('currencySelector').value = currentCurrency;

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

// Get all accounts and calculate total balance
const accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];
const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

// Initialize data
let transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
let userTransactions = transactions.filter(t => t.userId === currentUser.id);

// Calculate summary data
let monthlyIncome = userTransactions.filter(t => 
    t.type === 'income' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, t) => acc + t.amount, 0);
let monthlyExpenses = userTransactions.filter(t => 
    t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, t) => acc + t.amount, 0);

// Update summary cards
document.getElementById('totalBalance').textContent = formatAmount(totalBalance);
document.getElementById('monthlyIncome').textContent = formatAmount(monthlyIncome);
document.getElementById('monthlyExpenses').textContent = formatAmount(monthlyExpenses);

// Create charts
const expenseCtx = document.getElementById('expenseChart').getContext('2d');
const balanceCtx = document.getElementById('balanceChart').getContext('2d');

// Store chart instances for updates
let expenseChart, balanceChart;

// Expense chart
expenseChart = new Chart(expenseCtx, {
    type: 'doughnut',
    data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
            data: [monthlyIncome, monthlyExpenses],
            backgroundColor: ['#2ecc71', '#e74c3c']
        }]
    }
});

// Balance chart
balanceChart = new Chart(balanceCtx, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Balance History',
            data: [0, totalBalance],
            borderColor: '#3498db'
        }]
    }
});

// Add chart resize handler
function handleChartResize(chart) {
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            chart.resize();
        }
    });

    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        resizeObserver.observe(chartContainer);
    }
}

// Update chart initialization
function initializeCharts() {
    // ...existing chart initialization code...
    
    handleChartResize(balanceChart);
    handleChartResize(expenseChart);
}

// Add window resize listener
window.addEventListener('resize', () => {
    [balanceChart, expenseChart].forEach(chart => chart.resize());
});

// Add currency change handler
document.getElementById('currencySelector').addEventListener('change', function(e) {
    currentCurrency = e.target.value;
    localStorage.setItem(`currency_${currentUser.id}`, currentCurrency);
    updateDisplayAmounts();
    renderRecentTransactions(); // Re-render transactions with new currency
});

function updateDisplayAmounts() {
    document.getElementById('totalBalance').textContent = formatAmount(totalBalance);
    document.getElementById('monthlyIncome').textContent = formatAmount(monthlyIncome);
    document.getElementById('monthlyExpenses').textContent = formatAmount(monthlyExpenses);
    
    // Update charts with new currency
    updateCharts();
}

// Update the original updateCharts function
function updateCharts() {
    // Update expense chart with original values
    expenseChart.data.datasets[0].data = [monthlyIncome, monthlyExpenses];
    expenseChart.update();

    // Update balance chart with original values
    balanceChart.data.datasets[0].data = [0, totalBalance];
    balanceChart.update();
}

// Update welcome message
document.querySelector('.logo').textContent = `Cashmigo - ${currentUser.name}`;

// Update logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    ThemeManager.logout();
});

// Add function to render recent transactions
function renderRecentTransactions() {
    const recentTransactionsList = document.getElementById('recentTransactionsList');
    const sortedTransactions = userTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // Get only 5 most recent transactions

    recentTransactionsList.innerHTML = sortedTransactions.length ? 
        sortedTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">
                        ${transaction.categoryIcon ? 
                          `<img src="${transaction.categoryIcon}" class="category-icon" alt="${transaction.categoryName}">` : 
                          ''
                        }
                        <span>${transaction.description}</span>
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
        `).join('') : 
        '<p class="no-transactions">No recent transactions</p>';
}

// Add transaction update listener with proper event handling
window.addEventListener('transactionsUpdated', () => {
    // Reload all data
    transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    userTransactions = transactions.filter(t => t.userId === currentUser.id);

    // Recalculate all totals
    totalBalance = userTransactions.reduce((acc, t) => 
        t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    
    const currentMonth = new Date().getMonth();
    monthlyIncome = userTransactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth)
        .reduce((acc, t) => acc + t.amount, 0);
    
    monthlyExpenses = userTransactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((acc, t) => acc + t.amount, 0);

    // Update everything
    updateDisplayAmounts();
    renderRecentTransactions();
    updateCharts();
});

// Add accounts update listener
window.addEventListener('storage', (e) => {
    if (e.key === `accounts_${currentUser.id}`) {
        const updatedAccounts = JSON.parse(e.newValue) || [];
        const newTotalBalance = updatedAccounts.reduce((sum, account) => sum + account.balance, 0);
        document.getElementById('totalBalance').textContent = formatAmount(newTotalBalance);
        updateCharts();
    }
});

// Initial display update
updateDisplayAmounts();
renderRecentTransactions();
