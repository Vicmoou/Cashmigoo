// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// Initialize
const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
const timeRangeSelect = document.getElementById('timeRange');
const exportBtn = document.getElementById('exportBtn');

// Format amount helper
function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const symbols = { USD: '$', EUR: '€', AOA: 'Kz', BRL: 'R$' };
    return `${symbols[userCurrency]} ${Number(amount).toFixed(2)}`;
}

// Get filtered transactions based on time range
function getFilteredTransactions(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return transactions.filter(t => new Date(t.date) >= cutoffDate);
}

// Calculate category totals
function getCategoryTotals(filteredTransactions) {
    return filteredTransactions.reduce((acc, t) => {
        const key = `${t.categoryName} (${t.type})`;
        acc[key] = (acc[key] || 0) + t.amount;
        return acc;
    }, {});
}

// Generate monthly data
function getMonthlyData(filteredTransactions) {
    const monthlyData = {};
    filteredTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        monthlyData[monthYear][t.type] += t.amount;
    });
    return monthlyData;
}

// Add theme-aware chart configuration
function updateChartTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    Chart.defaults.color = isDark ? '#e2e8f0' : '#64748b';
    Chart.defaults.borderColor = isDark ? '#334155' : '#e2e8f0';
    
    const chartColors = {
        income: isDark ? '#059669' : '#10b981',
        expense: isDark ? '#dc2626' : '#ef4444',
        balance: isDark ? '#3b82f6' : '#2563eb'
    };

    if (window.categoryChart) {
        categoryChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#64748b';
        categoryChart.update();
    }
    if (window.monthlyChart) {
        monthlyChart.data.datasets[0].backgroundColor = chartColors.income;
        monthlyChart.data.datasets[1].backgroundColor = chartColors.expense;
        monthlyChart.update();
    }
    if (window.comparisonChart) {
        comparisonChart.data.datasets[0].backgroundColor = [chartColors.income, chartColors.expense];
        comparisonChart.update();
    }
}

// Update charts
function updateCharts() {
    const days = parseInt(timeRangeSelect.value);
    const filteredTransactions = getFilteredTransactions(days);
    const categoryTotals = getCategoryTotals(filteredTransactions);
    const monthlyData = getMonthlyData(filteredTransactions);

    // Category spending chart
    window.categoryChart = new Chart(document.getElementById('categoryChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [
                    '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c',
                    '#1abc9c', '#34495e', '#95a5a6', '#d35400', '#c0392b'
                ]
            }]
        }
    });

    // Monthly overview chart
    window.monthlyChart = new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(monthlyData),
            datasets: [{
                label: 'Income',
                data: Object.values(monthlyData).map(d => d.income),
                backgroundColor: '#2ecc71'
            }, {
                label: 'Expenses',
                data: Object.values(monthlyData).map(d => d.expense),
                backgroundColor: '#e74c3c'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Income vs Expenses chart
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    window.comparisonChart = new Chart(document.getElementById('comparisonChart'), {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [totalIncome, totalExpenses],
                backgroundColor: ['#2ecc71', '#e74c3c']
            }]
        }
    });

    // Budget analysis
    const budgetAnalysis = document.getElementById('budgetAnalysis');
    budgetAnalysis.innerHTML = `
        <div class="budget-item">
            <span>Total Income:</span>
            <strong class="income">${formatAmount(totalIncome)}</strong>
        </div>
        <div class="budget-item">
            <span>Total Expenses:</span>
            <strong class="expense">${formatAmount(totalExpenses)}</strong>
        </div>
        <div class="budget-item">
            <span>Net Savings:</span>
            <strong>${formatAmount(totalIncome - totalExpenses)}</strong>
        </div>
    `;
}

// Export data to CSV
function exportToCSV() {
    const filteredTransactions = getFilteredTransactions(parseInt(timeRangeSelect.value));
    const csvContent = [
        ['Date', 'Type', 'Category', 'Description', 'Amount'].join(','),
        ...filteredTransactions.map(t => [
            t.date,
            t.type,
            t.categoryName,
            t.description,
            t.amount
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Listen for theme changes
window.addEventListener('storage', (e) => {
    if (e.key === `theme_${currentUser.id}`) {
        updateChartTheme();
    }
});

// Initial chart theme update
updateChartTheme();

// Event listeners
timeRangeSelect.addEventListener('change', updateCharts);
exportBtn.addEventListener('click', exportToCSV);

// Initial render
updateCharts();
