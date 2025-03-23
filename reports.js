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
    const data = transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type,
        Category: t.categoryName,
        Description: t.description,
        Amount: t.amount
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
        "Date,Type,Category,Description,Amount\n" +
        data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Initialize reports
initializeCharts();