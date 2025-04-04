// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
    throw new Error('Authentication required');
}

// Debug information
console.log('Current user:', currentUser);

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

// Initialize mobile utilities
try {
    if (window.MobileUtils) {
        MobileUtils.init();
        console.log('Mobile utilities initialized');
    } else {
        console.log('MobileUtils not found, but this is optional');
    }
} catch (error) {
    console.error('Error initializing mobile utilities:', error);
}

// Get accounts data
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];
let transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
let budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || { income: [], expense: [] };
// Load loans and debts
let loans = JSON.parse(localStorage.getItem(`loans_${currentUser.id}`)) || [];
let debts = JSON.parse(localStorage.getItem(`debts_${currentUser.id}`)) || [];

// Debug data
console.log('Loaded data:', {
    accounts,
    transactions,
    budgets,
    categories,
    loans,
    debts
});

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

// Calculate all balances
function calculateBalances() {
    // Get cash accounts (savings, checking, etc.)
    const cashAccounts = accounts.filter(account => 
        ['savings', 'checking', 'Bank', 'Wallet'].includes(account.type));
    
    // Get credit/debt accounts
    const creditAccounts = accounts.filter(account => 
        ['credit', 'Visa', 'debt', 'loan'].includes(account.type));
    
    const cashBalance = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
    const creditBalance = creditAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Calculate loans total (money you lent to others)
    const loansTotal = loans.reduce((sum, loan) => {
        // If it's active and not fully paid off
        if (loan.status !== 'paid') {
            return sum + (loan.amount - (loan.paidAmount || 0));
        }
        return sum;
    }, 0);
    
    // Calculate debts total (money you owe to others)
    const debtsTotal = debts.reduce((sum, debt) => {
        // If it's active and not fully paid off
        if (debt.status !== 'paid') {
            return sum + (debt.amount - (debt.paidAmount || 0));
        }
        return sum;
    }, 0);
    
    // Total balance calculation (including loans but subtracting debts)
    const totalBalance = cashBalance + creditBalance + loansTotal - debtsTotal;
    
    console.log('Calculated balances:', { 
        cashBalance, 
        creditBalance, 
        loansTotal, 
        debtsTotal, 
        totalBalance 
    });
    
    return { 
        cashBalance, 
        creditBalance, 
        loansTotal, 
        debtsTotal, 
        totalBalance 
    };
}

// Update balance displays
function updateBalanceDisplay() {
    const { totalBalance, loansTotal, debtsTotal } = calculateBalances();
    
    // Update total balance
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatAmount(totalBalance);
        
        // Add a class for styling when negative
        if (totalBalance < 0) {
            totalBalanceElement.classList.add('negative');
        } else {
            totalBalanceElement.classList.remove('negative');
        }
    } else {
        console.error('Element with ID "totalBalance" not found');
    }
    
    // Update loans balance (money you lent to others)
    const cashBalanceElement = document.getElementById('cashBalance');
    if (cashBalanceElement) {
        cashBalanceElement.textContent = formatAmount(loansTotal);
        // Update label
        const cashLabelElement = cashBalanceElement.previousElementSibling;
        if (cashLabelElement) {
            cashLabelElement.textContent = 'Loans:';
        }
        // Update icon
        const cashIconElement = cashLabelElement.previousElementSibling;
        if (cashIconElement) {
            cashIconElement.className = 'fas fa-money-bill-trend-up';
        }
    } else {
        console.error('Element with ID "cashBalance" not found');
    }
    
    // Update debts balance (money you owe to others)
    const creditBalanceElement = document.getElementById('creditBalance');
    if (creditBalanceElement) {
        // For debts, we want to show them as negative numbers
        creditBalanceElement.textContent = `-${formatAmount(debtsTotal)}`;
        // Update label
        const creditLabelElement = creditBalanceElement.previousElementSibling;
        if (creditLabelElement) {
            creditLabelElement.textContent = 'Debts:';
        }
        // Update icon
        const creditIconElement = creditLabelElement.previousElementSibling;
        if (creditIconElement) {
            creditIconElement.className = 'fas fa-money-bill-transfer';
        }
    } else {
        console.error('Element with ID "creditBalance" not found');
    }
    
    // Update individual accounts list
    renderUserAccounts();
}

// Render the user's individual accounts
function renderUserAccounts() {
    const accountsContainer = document.getElementById('userAccounts');
    if (!accountsContainer) {
        console.error('Element with ID "userAccounts" not found');
        return;
    }
    
    // Check if we have accounts, loans, or debts to display
    if (accounts.length === 0 && loans.length === 0 && debts.length === 0) {
        accountsContainer.innerHTML = `
            <div style="text-align: center; padding: 1rem; opacity: 0.7;">
                No accounts or loans found. Create accounts in the Accounts page.
            </div>
        `;
        console.log('No accounts, loans or debts to display');
        return;
    }
    
    console.log('Rendering accounts:', accounts);
    console.log('Rendering loans:', loans);
    console.log('Rendering debts:', debts);
    
    let accountsHTML = '';
    
    // First add bank accounts
    accounts.forEach(account => {
        const isNegative = account.balance < 0;
        accountsHTML += `
            <div class="account-item">
                <div class="account-info">
                    <div class="account-icon">
                        ${account.icon ? 
                          `<img src="${account.icon}" class="account-icon-img" alt="${account.name}">` : 
                          `<i class="fas ${getAccountIcon(account.type)}"></i>`
                        }
                    </div>
                    <div class="account-name">${account.name}</div>
                </div>
                <div class="account-value ${isNegative ? 'negative' : ''}">${formatAmount(account.balance)}</div>
            </div>
        `;
    });
    
    // Add active loans (money lent to others)
    loans.filter(loan => loan.status !== 'paid').forEach(loan => {
        const remainingAmount = loan.amount - (loan.paidAmount || 0);
        accountsHTML += `
            <div class="account-item">
                <div class="account-info">
                    <div class="account-icon">
                        <i class="fas fa-money-bill-trend-up"></i>
                    </div>
                    <div class="account-name">Loan: ${loan.borrower || 'Unknown'}</div>
                </div>
                <div class="account-value">${formatAmount(remainingAmount)}</div>
            </div>
        `;
    });
    
    // Add active debts (money you owe to others)
    debts.filter(debt => debt.status !== 'paid').forEach(debt => {
        const remainingAmount = debt.amount - (debt.paidAmount || 0);
        accountsHTML += `
            <div class="account-item">
                <div class="account-info">
                    <div class="account-icon">
                        <i class="fas fa-money-bill-transfer"></i>
                    </div>
                    <div class="account-name">Debt: ${debt.lender || 'Unknown'}</div>
                </div>
                <div class="account-value negative">-${formatAmount(remainingAmount)}</div>
            </div>
        `;
    });
    
    accountsContainer.innerHTML = accountsHTML;
}

// Get appropriate icon for account type
function getAccountIcon(accountType) {
    const accountTypeIcons = {
        'savings': 'fa-piggy-bank',
        'checking': 'fa-money-bill-wave',
        'Bank': 'fa-landmark',
        'Wallet': 'fa-wallet',
        'credit': 'fa-credit-card',
        'Visa': 'fa-credit-card',
        'debt': 'fa-hand-holding-usd',
        'loan': 'fa-hand-holding-usd'
    };
    
    return accountTypeIcons[accountType] || 'fa-coins';
}

// Debug utility - print all localStorage keys and values
function debugLocalStorage() {
    console.log('All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const value = localStorage.getItem(key);
            console.log(`${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        } catch (error) {
            console.log(`${key}: [Error reading value]`);
        }
    }
}

// Get user's actual categories from their data
function getUserCategories() {
    // Get all expense categories
    const expenseCategories = categories.expense || [];
    
    // If they have no categories, create some sensible defaults
    if (expenseCategories.length === 0) {
        return [
            { name: 'Housing', color: '#8b5cf6' },
            { name: 'Transportation', color: '#06b6d4' },
            { name: 'Food', color: '#f59e0b' },
            { name: 'Personal', color: '#ec4899' }
        ];
    }
    
    // Otherwise use their actual categories with assigned colors
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#ef4444', '#3b82f6', '#64748b'];
    
    return expenseCategories.slice(0, 8).map((category, index) => {
        return {
            name: category.name,
            color: colors[index % colors.length],
            id: category.id
        };
    });
}

// Get spending data for pie chart
function getSpendingData() {
    // Get user categories
    const userCategories = getUserCategories();
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter transactions for current month and expenses only
    const monthlyExpenses = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return tx.type === 'expense' && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear;
    });
    
    // Group by category
    const categoryTotals = {};
    monthlyExpenses.forEach(tx => {
        const category = tx.categoryName || 'Uncategorized';
        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }
        categoryTotals[category] += tx.amount;
    });
    
    // Create chart data
    const labels = [];
    const amounts = [];
    const backgroundColors = [];
    
    // If no real data, return empty arrays
    if (Object.keys(categoryTotals).length === 0) {
        return { 
            labels, 
            amounts, 
            backgroundColors,
            hasData: false
        };
    }
    
    // Sort categories by amount (highest first)
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4); // Get top 4 categories
    
    sortedCategories.forEach((item, index) => {
        const categoryName = item[0];
        const amount = item[1];
        
        // Find matching user category
        const matchingCategory = userCategories.find(cat => cat.name === categoryName);
        
        labels.push(categoryName);
        amounts.push(amount);
        backgroundColors.push(matchingCategory ? matchingCategory.color : userCategories[index % userCategories.length].color);
    });
    
    return { 
        labels, 
        amounts, 
        backgroundColors,
        hasData: true
    };
}

// Update chart legends to match user categories
function updateChartLegends() {
    const { labels, backgroundColors, hasData } = getSpendingData();
    const legendContainer = document.querySelector('.chart-legend');
    
    if (!legendContainer) return;
    
    // Clear the legend first
    legendContainer.innerHTML = '';
    
    // If no data, don't try to render legends
    if (!hasData || labels.length === 0) return;
    
    // Create legend HTML based on actual data
    let legendHTML = '';
    
    labels.forEach((label, index) => {
        const color = backgroundColors[index];
        
        legendHTML += `
            <div class="legend-item">
                <span class="legend-dot" style="background: ${color};"></span>
                <span class="legend-label">${label}</span>
            </div>
        `;
    });
    
    legendContainer.innerHTML = legendHTML;
}

// Calculate budget progress
function calculateBudgetProgress() {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    console.log('Calculating budget progress for month:', currentMonth, 'year:', currentYear);
    
    // Reload budgets to ensure we have the latest data
    budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
    console.log('Loaded budgets from localStorage:', budgets);
    
    // Find all available budget months
    const budgetMonths = [];
    
    Object.keys(budgets).forEach(budgetKey => {
        const budget = budgets[budgetKey];
        if (!budget) return;
        
        // Get month from key or property
        let budgetMonth = budget.month;
        if (budgetMonth === undefined && budgetKey.includes('_')) {
            const parts = budgetKey.split('_');
            if (parts.length >= 2) {
                budgetMonth = parseInt(parts[1]);
                if (!isNaN(budgetMonth)) {
                    budgetMonths.push(budgetMonth);
                }
            }
        } else if (budgetMonth !== undefined) {
            budgetMonths.push(budgetMonth);
        }
    });
    
    console.log('Available budget months:', budgetMonths);
    
    // If we have no budget months at all, just use current month (will show empty)
    let selectedMonth = currentMonth;
    
    // If we have budget months but not the current month,
    // use the most recent budget month
    if (budgetMonths.length > 0 && !budgetMonths.includes(currentMonth)) {
        // Find closest month to current month
        selectedMonth = budgetMonths.sort((a, b) => {
            // Sort in descending order (most recent first)
            return b - a;
        })[0];
        console.log('No budget for current month, using most recent budget month:', selectedMonth);
    }
    
    // Get total spent for selected month
    const totalSpent = transactions
        .filter(tx => {
            const txDate = new Date(tx.date);
            return tx.type === 'expense' && 
                   txDate.getMonth() === selectedMonth && 
                   txDate.getFullYear() === currentYear;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    console.log('Total spent in selected month:', totalSpent, 'Month:', selectedMonth);
    
    // Get total budget for selected month
    let totalBudget = 0;
    let foundBudgetForSelectedMonth = false;
    
    // Check if we have any budgets
    if (Object.keys(budgets).length === 0) {
        console.log('No budgets found at all');
        return { 
            percentage: 0, 
            spent: totalSpent, 
            budget: 0,
            hasBudget: false,
            selectedMonth: selectedMonth
        };
    }
    
    console.log('Processing budgets for selected month:', selectedMonth);
    
    // Process budgets for the selected month
    let processedCategories = new Set();

    Object.keys(budgets).forEach(budgetKey => {
        const budget = budgets[budgetKey];
        
        // Skip invalid budget entries
        if (!budget) {
            console.log(`Skipping invalid budget for key ${budgetKey}`);
            return;
        }
        
        // Check if this budget has a month property or is in the format categoryId_month
        let budgetMonth = budget.month;
        let categoryId = budget.categoryId;
        
        if (budgetMonth === undefined && budgetKey.includes('_')) {
            // Extract month from the key (new format)
            const parts = budgetKey.split('_');
            if (parts.length >= 2) {
                budgetMonth = parseInt(parts[1]);
                // Also extract categoryId if not present
                if (!categoryId && parts.length >= 1) {
                    categoryId = parts[0];
                }
            }
        }
        
        // Debug the actual values in the budget object
        console.log(`Budget ${budgetKey} details:`, {
            month: budgetMonth,
            amount: budget.amount,
            categoryId: categoryId,
            categoryName: budget.categoryName,
            fullObject: budget
        });
        
        // Skip if we've already processed this category (prevent duplicates)
        const categoryKey = `${categoryId}_${budgetMonth}`;
        if (processedCategories.has(categoryKey)) {
            console.log(`Skipping duplicate budget for category ${categoryId} in month ${budgetMonth}`);
            return;
        }
        
        // Only count budgets for the selected month or with no specific month (old format)
        if (budgetMonth === selectedMonth || budgetMonth === undefined) {
            foundBudgetForSelectedMonth = true;
            
            if (budget.amount !== undefined && !isNaN(parseFloat(budget.amount))) {
                const actualAmount = parseFloat(budget.amount);
                totalBudget += actualAmount;
                processedCategories.add(categoryKey);
                console.log(`Added ${actualAmount} to total budget from ${budgetKey}`);
            } else if (budget.monthlyAmount !== undefined && !isNaN(parseFloat(budget.monthlyAmount))) {
                const actualAmount = parseFloat(budget.monthlyAmount);
                totalBudget += actualAmount;
                processedCategories.add(categoryKey);
                console.log(`Added ${actualAmount} to total budget from ${budgetKey}`);
            } else {
                console.log(`Budget ${budgetKey} has no valid amount`);
            }
        } else {
            console.log(`Budget ${budgetKey} is for month ${budgetMonth}, not selected month ${selectedMonth}`);
        }
    });
    
    console.log('Final total budget for month:', totalBudget, 'Found budget for selected month:', foundBudgetForSelectedMonth);
    
    // If no budget for selected month, return zeros
    if (totalBudget === 0 || !foundBudgetForSelectedMonth) {
        console.log('No valid budget for the selected month');
        return { 
            percentage: 0, 
            spent: totalSpent, 
            budget: 0,
            hasBudget: false,
            selectedMonth: selectedMonth
        };
    }
    
    const percentage = (totalSpent / totalBudget) * 100;
    console.log('Budget percentage:', percentage);
    
    return { 
        percentage: Math.min(percentage, 100), // Cap at 100%
        spent: totalSpent,
        budget: totalBudget,
        hasBudget: true,
        selectedMonth: selectedMonth
    };
}

// Initialize spending chart
function initializeSpendingChart() {
    const spendingCtx = document.getElementById('spendingChart');
    const noSpendingData = document.getElementById('noSpendingData');
    const chartContainer = document.querySelector('.chart-container');
    
    if (!spendingCtx) return;
    
    const { labels, amounts, backgroundColors, hasData } = getSpendingData();
    
    // Show empty state if no data
    if (!hasData || amounts.length === 0) {
        if (noSpendingData) noSpendingData.style.display = 'block';
        if (chartContainer) chartContainer.style.display = 'none';
        return;
    } else {
        if (noSpendingData) noSpendingData.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'block';
    }
    
    // Create gradient backgrounds for better visual
    const ctx = spendingCtx.getContext('2d');
    const gradientBackgrounds = backgroundColors.map(color => {
        // Create a gradient version of each color
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (match) {
            const [_, r, g, b] = match;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.6)`);
            return gradient;
        }
        return color;
    });
    
    // Destroy previous chart if it exists
    if (window.spendingChartInstance) {
        window.spendingChartInstance.destroy();
    }
    
    window.spendingChartInstance = new Chart(spendingCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 6,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            cutout: '70%',
            layout: {
                padding: 15
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    cornerRadius: 8,
                    boxPadding: 5,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formatAmount(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutCubic'
            }
        }
    });
    
    // Update legends to match the chart
    updateChartLegends();
}

// Update budget progress display
function updateBudgetProgress() {
    console.log('Updating budget progress display');
    
    const { percentage, spent, budget, hasBudget, selectedMonth } = calculateBudgetProgress();
    console.log('Budget calculation result:', { percentage, spent, budget, hasBudget, selectedMonth });
    
    // Clear any existing elements first to prevent duplication
    const budgetCategoriesList = document.getElementById('budgetCategoriesList');
    if (budgetCategoriesList) {
        budgetCategoriesList.innerHTML = '';
    }
    
    // Progress elements removed
    const noBudgetDataElement = document.getElementById('noBudgetData');
    
    console.log('Found elements:', { 
        noBudgetDataElement: !!noBudgetDataElement,
        budgetCategoriesList: !!budgetCategoriesList
    });
    
    // Get month name for selected month
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const selectedMonthName = months[selectedMonth];
    
    // Update the budget section title to show selected month
    const budgetTitle = document.querySelector('.budget-title');
    if (budgetTitle) {
        // Clear any existing content first
        budgetTitle.innerHTML = '';
        
        // If it's not the current month, add a note
        if (selectedMonth !== currentMonth) {
            budgetTitle.textContent = `${selectedMonthName} Budget`;
            budgetTitle.innerHTML += ` <span class="budget-note">(Only month with budget)</span>`;
        } else {
            budgetTitle.textContent = `${selectedMonthName} Budget`;
        }
        console.log('Updated budget title to:', budgetTitle.textContent);
    }
    
    // Show empty state if no budget
    if (!hasBudget) {
        console.log('No budget to display, showing empty state');
        if (budgetCategoriesList) budgetCategoriesList.style.display = 'none';
        if (noBudgetDataElement) {
            noBudgetDataElement.style.display = 'block';
            // Update the empty state message to mention the selected month
            const emptyMessage = noBudgetDataElement.querySelector('.empty-message');
            if (emptyMessage) {
                emptyMessage.textContent = `No budget set for ${selectedMonthName}. Set a budget to track your spending.`;
                console.log('Updated empty message to:', emptyMessage.textContent);
            }
        }
        return;
    } else {
        console.log('Budget exists, showing budget categories');
        if (budgetCategoriesList) budgetCategoriesList.style.display = 'block';
        if (noBudgetDataElement) noBudgetDataElement.style.display = 'none';
    }
    
    // Display categories breakdown with circular progress bars
    if (budgetCategoriesList) {
        // Get category budgets for the selected month
        const categoryBudgets = [];
        
        // Keep track of processed categories to avoid duplicates
        const processedCategories = new Set();
        
        // First pass - collect all budgets for the selected month
        Object.keys(budgets).forEach(budgetKey => {
            const budget = budgets[budgetKey];
            
            // Skip invalid budget entries
            if (!budget) return;
            
            // Check if this budget has a month property or is in the format categoryId_month
            let budgetMonth = budget.month;
            let categoryId = budget.categoryId;
            let categoryName = budget.categoryName;
            let categoryIcon = budget.categoryIcon;
            
            if (budgetMonth === undefined && budgetKey.includes('_')) {
                // Extract month from the key (new format)
                const parts = budgetKey.split('_');
                if (parts.length >= 2) {
                    budgetMonth = parseInt(parts[1]);
                    // Also extract categoryId if not present
                    if (!categoryId && parts.length >= 1) {
                        categoryId = parts[0];
                    }
                }
            }
            
            // Only process budgets for the selected month
            if (budgetMonth !== selectedMonth) return;
            
            // Skip if we've already processed this category
            if (processedCategories.has(categoryId)) return;
            processedCategories.add(categoryId);
            
            // Parse amount to ensure it's a number
            let amount = 0;
            if (budget.amount !== undefined) {
                amount = parseFloat(budget.amount);
            } else if (budget.monthlyAmount !== undefined) {
                amount = parseFloat(budget.monthlyAmount);
            }
            
            if (isNaN(amount) || amount <= 0) return;
            
            // Find the category
            const category = categories.expense.find(c => c.id === categoryId);
            if (!category) return;
            
            // Calculate spent amount for this category
            const spent = transactions
                .filter(tx => {
                    const txDate = new Date(tx.date);
                    return tx.type === 'expense' && 
                           tx.categoryId === categoryId &&
                           txDate.getMonth() === selectedMonth && 
                           txDate.getFullYear() === currentYear;
                })
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            // Calculate progress percentage
            const progress = (spent / amount) * 100;
            
            // Determine status class
            let statusClass = 'safe';
            if (progress >= 90) statusClass = 'danger';
            else if (progress >= 75) statusClass = 'warning';
            
            categoryBudgets.push({
                categoryId,
                categoryName: category.name,
                categoryIcon: category.icon,
                amount,
                spent,
                progress,
                statusClass
            });
        });
        
        // Sort by highest percentage spent first
        categoryBudgets.sort((a, b) => b.progress - a.progress);
        
        // Generate HTML for category budgets
        let categoryBudgetsHTML = '';
        
        categoryBudgets.forEach(item => {
            // Calculate the circular progress stroke-dashoffset
            // Circle circumference is 2*PI*r. Using a radius of around 30px (for 60px circle)
            const circumference = 2 * Math.PI * 29; // Slightly less than radius to account for stroke width
            const dashOffset = circumference - (item.progress / 100) * circumference;
            
            categoryBudgetsHTML += `
                <div class="budget-category-item">
                    <div class="category-progress">
                        <svg class="category-progress-circle" width="60" height="60" viewBox="0 0 60 60">
                            <circle class="bg-circle" cx="30" cy="30" r="26" stroke-width="6"></circle>
                            <circle class="progress-circle ${item.statusClass}" cx="30" cy="30" r="26" 
                                stroke-width="6" stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${dashOffset}"></circle>
                        </svg>
                        <span class="category-progress-percentage">${Math.round(item.progress)}%</span>
                    </div>
                    
                    <div class="budget-category-content">
                        <div class="budget-category-header">
                            <div class="category-info">
                                ${item.categoryIcon ? 
                                  `<div class="category-icon"><img src="${item.categoryIcon}" alt="${item.categoryName}"></div>` : 
                                  `<div class="category-icon"><i class="fas fa-tag"></i></div>`
                                }
                                <div class="category-name">${item.categoryName}</div>
                            </div>
                        </div>
                        <div class="category-amount">${formatAmount(item.spent)} / ${formatAmount(item.amount)}</div>
                        <div class="category-details">
                            <span>${formatAmount(item.amount - item.spent)} remaining</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Update the DOM
        budgetCategoriesList.innerHTML = categoryBudgetsHTML;
        
        if (categoryBudgets.length === 0) {
            budgetCategoriesList.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--text-light, #6b7280); font-size: 0.9rem;">
                    <p>No category budgets found for ${selectedMonthName}.</p>
                </div>
            `;
        }
    }
}

// Toggle visibility of spending and budget sections
function toggleSections() {
    const spendingSection = document.getElementById('spendingSection');
    const budgetSection = document.getElementById('budgetSection');
    const showDetails = localStorage.getItem(`showDetails_${currentUser.id}`);
    
    if (showDetails === 'false') {
        if (spendingSection) spendingSection.style.display = 'none';
        if (budgetSection) budgetSection.style.display = 'none';
    } else {
        if (spendingSection) spendingSection.style.display = 'block';
        if (budgetSection) budgetSection.style.display = 'block';
    }
}

// Set month names in period labels
function setMonthLabels() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const periodElements = document.querySelectorAll('.period');
    periodElements.forEach(element => {
        element.textContent = `${months[currentMonth]} ${currentYear}`;
    });
}

// Add subtle animations
function addAnimations() {
    // Fade in cards with slight delay between them
    const cards = document.querySelectorAll('.total-balance-card, .chart-container, .budget-progress');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}

// Initialize page
function initializePage() {
    console.log('Initializing page...');
    
    try {
        // Make sure we have the latest data
        budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
        transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
        categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || { income: [], expense: [] };
        
        console.log('Loaded budgets from localStorage during initialization:', budgets);
        
        // Debug localStorage content
        debugLocalStorage();
        
        // Update UI elements
        updateBalanceDisplay();
        initializeSpendingChart();
        updateBudgetProgress();
        setMonthLabels();
        addAnimations();
        toggleSections();
        
        console.log('Page initialized successfully');
    } catch (error) {
        console.error('Error during page initialization:', error);
    }
    
    // Add click handler to total balance card
    const totalBalanceCard = document.querySelector('.total-balance-card');
    if (totalBalanceCard) {
        totalBalanceCard.addEventListener('click', () => {
            const spendingSection = document.getElementById('spendingSection');
            const budgetSection = document.getElementById('budgetSection');
            const showDetails = localStorage.getItem(`showDetails_${currentUser.id}`) !== 'false';
            
            localStorage.setItem(`showDetails_${currentUser.id}`, !showDetails);
            console.log('Toggle details:', !showDetails);
            
            if (showDetails) {
                if (spendingSection) spendingSection.style.display = 'none';
                if (budgetSection) budgetSection.style.display = 'none';
            } else {
                if (spendingSection) spendingSection.style.display = 'block';
                if (budgetSection) budgetSection.style.display = 'block';
            }
        });
    } else {
        console.error('Total balance card element not found');
    }
    
    // Add handlers for empty state buttons
    const addTransactionFromEmptyBtn = document.getElementById('addTransactionFromEmptyBtn');
    if (addTransactionFromEmptyBtn) {
        addTransactionFromEmptyBtn.addEventListener('click', () => {
            // Open the modal instead of redirecting
            openTransactionModal();
        });
    }
    
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', () => {
            window.location.href = 'budget.html';
        });
    }
    
    // Add handler for theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-mode');
            if (isDark) {
                document.body.classList.remove('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem(`theme_${currentUser.id}`, 'light');
            } else {
                document.body.classList.add('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem(`theme_${currentUser.id}`, 'dark');
            }
        });
        
        // Set initial theme icon
        if (document.body.classList.contains('dark-mode')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Add handler for add transaction button
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => {
            // Open the modal instead of redirecting
            openTransactionModal();
        });
    }
    
    // Add handler for budget refresh button
    const refreshBudgetBtn = document.getElementById('refreshBudgetBtn');
    if (refreshBudgetBtn) {
        refreshBudgetBtn.addEventListener('click', () => {
            console.log('Manually refreshing budget data and display');
            // Show debug info
            const currentBudgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
            console.log('Budget keys:', Object.keys(currentBudgets));

            // Count total budgets and check for duplicates
            const budgetMonths = new Set();
            const categoriesWithBudgets = new Set();
            const categoryMonthCombos = new Set();
            let duplicatesFound = false;

            Object.keys(currentBudgets).forEach(key => {
                const budget = currentBudgets[key];
                let month = budget.month;
                let categoryId = budget.categoryId;
                
                // Try to extract from key if needed
                if (key.includes('_')) {
                    const parts = key.split('_');
                    if (!categoryId && parts.length >= 1) categoryId = parts[0];
                    if (month === undefined && parts.length >= 2) month = parseInt(parts[1]);
                }
                
                if (month !== undefined) budgetMonths.add(month);
                if (categoryId) categoriesWithBudgets.add(categoryId);
                
                // Check for duplicates
                const comboKey = `${categoryId}_${month}`;
                if (categoryMonthCombos.has(comboKey)) {
                    duplicatesFound = true;
                    console.warn(`Duplicate found for category ${categoryId} in month ${month}`);
                } else {
                    categoryMonthCombos.add(comboKey);
                }
            });

            console.log('Budget months found:', Array.from(budgetMonths));
            console.log('Categories with budgets:', Array.from(categoriesWithBudgets));
            console.log('Duplicate category+month combinations found:', duplicatesFound);
            
            // Reload latest budget data
            budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
            // Update the display
            updateBudgetProgress();
            // Add visual feedback
            refreshBudgetBtn.classList.add('spinning');
            setTimeout(() => {
                refreshBudgetBtn.classList.remove('spinning');
            }, 1000);
            
            // Show debug info in alert if there are issues
            if (duplicatesFound) {
                alert('⚠️ Duplicate budgets found!\nPlease go to the Budget page and click the "Repair" or "Reset All" button to fix this issue.');
            }
        });
    }
}

// Add listener for account updates
window.addEventListener('storage', (e) => {
    const currentUserObj = JSON.parse(localStorage.getItem('currentUser'));
    const userId = currentUserObj?.id || '';
    
    // Handle both standard storage events and custom events
    const storageKey = e.key || (e.detail && e.detail.key);
    console.log('Storage event detected:', storageKey);
    
    if (storageKey === `accounts_${userId}` || 
        storageKey === `transactions_${userId}` ||
        storageKey === `budgets_${userId}` ||
        storageKey === `categories_${userId}` ||
        storageKey === `loans_${userId}` ||
        storageKey === `debts_${userId}`) {
        // Reload data
        if (storageKey === `accounts_${userId}`) {
            accounts = JSON.parse(localStorage.getItem(`accounts_${userId}`)) || [];
            console.log('Homepage: Updated accounts from storage event', accounts);
        } else if (storageKey === `transactions_${userId}`) {
            transactions = JSON.parse(localStorage.getItem(`transactions_${userId}`)) || [];
            console.log('Homepage: Updated transactions from storage event');
        } else if (storageKey === `budgets_${userId}`) {
            const newBudgets = JSON.parse(localStorage.getItem(`budgets_${userId}`)) || {};
            console.log('Homepage: Updated budgets from storage event', newBudgets);
            budgets = newBudgets;
        } else if (storageKey === `categories_${userId}`) {
            categories = JSON.parse(localStorage.getItem(`categories_${userId}`)) || { income: [], expense: [] };
            console.log('Homepage: Updated categories from storage event');
        } else if (storageKey === `loans_${userId}`) {
            loans = JSON.parse(localStorage.getItem(`loans_${userId}`)) || [];
            console.log('Homepage: Updated loans from storage event', loans);
        } else if (storageKey === `debts_${userId}`) {
            debts = JSON.parse(localStorage.getItem(`debts_${userId}`)) || [];
            console.log('Homepage: Updated debts from storage event', debts);
        }
        
        // Update the UI
        updateBalanceDisplay();
        initializeSpendingChart(); // Recreate chart with new data
        updateBudgetProgress();
    } else if (storageKey === `theme_${userId}`) {
        // Update theme if changed in another tab
        const theme = localStorage.getItem(`theme_${userId}`);
        const themeToggle = document.getElementById('themeToggle');
        
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
});

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

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
        // Remove event listeners to prevent duplicates
        transactionTypeSelect.removeEventListener('change', transactionTypeSelect.changeHandler);
        accountSelect.removeEventListener('change', accountSelect.changeHandler);
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

// Add direct click handler for save transaction button to ensure form submission works
document.addEventListener('DOMContentLoaded', function() {
    // Get the save transaction button
    const saveTransactionBtn = document.getElementById('saveTransaction');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            console.log('Save Transaction button clicked');
            
            // Get the status element
            const statusElement = document.getElementById('transactionStatus');
            const statusMessage = statusElement.querySelector('.status-message');
            
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
                
                // Refresh UI
                updateBalanceDisplay();
                initializeSpendingChart();
                updateBudgetProgress();
                
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
        });
    }
});
