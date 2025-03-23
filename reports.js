// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// Initialize charts and data
const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
let expenseChart, incomeChart, balanceChart;

function initializeCharts() {
    const monthlyData = getMonthlyData(transactions);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Category spending chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryData = getCategoryTotals(transactions);
    
    new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        }
    });

    // Monthly overview chart
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Income',
                data: months.map((_, i) => monthlyData[i]?.income || 0),
                backgroundColor: '#10b981'
            }, {
                label: 'Expenses',
                data: months.map((_, i) => monthlyData[i]?.expense || 0),
                backgroundColor: '#ef4444'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Income vs Expenses chart
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    const totals = getTransactionTotals(transactions);
    
    new Chart(comparisonCtx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [totals.income, totals.expenses],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        }
    });

    // Income/Expense Chart
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart').getContext('2d');
    expenseChart = new Chart(incomeExpenseCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: months.map((_, i) => monthlyData[i]?.income || 0),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Expenses',
                    data: months.map((_, i) => monthlyData[i]?.expense || 0),
                    backgroundColor: '#ef4444'
                }
            ]
        }
    });

    // Update totals
    updateTotals(transactions);
}

function getMonthlyData(transactions) {
    return transactions.reduce((acc, t) => {
        const month = new Date(t.date).getMonth();
        if (!acc[month]) acc[month] = { income: 0, expense: 0 };
        if (t.type === 'income') acc[month].income += t.amount;
        else acc[month].expense += t.amount;
        return acc;
    }, {});
}

function getCategoryTotals(transactions) {
    const categoryTotals = transactions.reduce((acc, t) => {
        if (!acc[t.categoryName]) {
            acc[t.categoryName] = 0;
        }
        acc[t.categoryName] += t.amount;
        return acc;
    }, {});

    return {
        labels: Object.keys(categoryTotals),
        values: Object.values(categoryTotals)
    };
}

function getTransactionTotals(transactions) {
    return transactions.reduce((acc, t) => {
        if (t.type === 'income') {
            acc.income += t.amount;
        } else {
            acc.expenses += t.amount;
        }
        return acc;
    }, { income: 0, expenses: 0 });
}

function updateTotals(transactions) {
    const totals = transactions.reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
    }, { income: 0, expense: 0 });

    document.getElementById('totalIncome').textContent = formatAmount(totals.income);
    document.getElementById('totalExpenses').textContent = formatAmount(totals.expense);
    document.getElementById('netIncome').textContent = formatAmount(totals.income - totals.expense);
}

// Add theme-aware chart configuration
function updateChartTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    Chart.defaults.color = isDark ? '#e2e8f0' : '#64748b';
    Chart.defaults.borderColor = isDark ? '#334155' : '#e2e8f0';
    
    if (expenseChart) {
        expenseChart.update();
    }
    if (incomeChart) {
        incomeChart.update();
    }
    if (balanceChart) {
        balanceChart.update();
    }
}

// Listen for theme changes
window.addEventListener('storage', (e) => {
    if (e.key === `theme_${currentUser.id}`) {
        updateChartTheme();
    }
});

// Initial chart theme update
updateChartTheme();

// Update transaction listener
window.addEventListener('transactionsUpdated', () => {
    const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    updateReports(transactions);
});

function updateReports(transactions) {
    // Group transactions by month
    const monthlyData = transactions.reduce((acc, t) => {
        const month = new Date(t.date).getMonth();
        if (!acc[month]) {
            acc[month] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            acc[month].income += t.amount;
        } else {
            acc[month].expense += t.amount;
        }
        return acc;
    }, {});

    // Update charts
    updateChartData(monthlyData);
    updateTotals(transactions);
    updateChartTheme();
}

// Export functionality
document.getElementById('exportBtn').addEventListener('click', function() {
    try {
        // Format data for export
        const exportData = transactions.map(t => ({
            Date: new Date(t.date).toLocaleDateString(),
            Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
            Category: t.categoryName,
            Description: t.description,
            Amount: formatAmount(t.amount),
            Account: t.accountName || 'N/A'
        }));

        // Create CSV content
        const headers = Object.keys(exportData[0]);
        const csvRows = [
            headers.join(','),
            ...exportData.map(row => 
                headers.map(header => 
                    `"${row[header]}"`
                ).join(',')
            )
        ];
        const csvContent = csvRows.join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data. Please try again.');
    }
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Initialize reports
initializeCharts();