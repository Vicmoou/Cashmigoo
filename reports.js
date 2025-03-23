// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// ...existing code...

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