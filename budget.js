// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// Initialize data
let budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser.id}`)) || {};
const categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
    income: [],
    expense: []
};
let transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];

// DOM Elements
const modal = document.getElementById('budgetModal');
const addBudgetBtn = document.getElementById('addBudgetBtn');
const closeModalBtn = document.getElementById('closeModal');
const categoryBudgets = document.getElementById('categoryBudgets');

// Show/hide modal
addBudgetBtn.onclick = () => {
    console.log('Opening budget modal');
    populateCategorySelect();
    modal.style.display = 'block';
};
closeModalBtn.onclick = () => modal.style.display = 'none';

// Format amount
function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const symbols = { USD: '$', EUR: '€', AOA: 'Kz', BRL: 'R$' };
    return `${symbols[userCurrency]} ${Number(amount).toFixed(2)}`;
}

// Calculate current month's spending for a category
function getCategorySpending(categoryId) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
        .filter(t => {
            const date = new Date(t.date);
            return t.categoryId === categoryId && 
                   date.getMonth() === currentMonth && 
                   date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
}

// Populate category select with icons
function populateCategorySelect() {
    const select = document.getElementById('categorySelect');
    const warning = document.querySelector('.category-warning');
    
    select.innerHTML = '<option value="">Select a category</option>';
    
    console.log('Loading categories:', categories);
    
    if (!categories.expense || categories.expense.length === 0) {
        warning.style.display = 'block';
        warning.textContent = 'Please create expense categories first in the Categories page';
        select.disabled = true;
        return;
    }
    
    categories.expense.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (category.icon) {
            // Add icon data to option for styling
            option.setAttribute('data-icon', category.icon);
            option.style.backgroundImage = `url(${category.icon})`;
            option.style.backgroundSize = '20px';
            option.style.backgroundRepeat = 'no-repeat';
            option.style.backgroundPosition = '5px center';
            option.style.paddingLeft = '30px';
        }
        select.appendChild(option);
    });
    
    warning.style.display = 'none';
    select.disabled = false;
}

// Add function to create test budget for current month
function createTestBudget() {
    console.log('Creating test budget for current month');
    
    // Only proceed if we have expense categories
    if (!categories.expense || categories.expense.length === 0) {
        console.error('No expense categories found to create test budget');
        return;
    }
    
    // Get the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Use the first expense category
    const category = categories.expense[0];
    
    // Create budget key
    const budgetKey = `${category.id}_${currentMonth}`;
    
    // Create test budget with a reasonable amount
    budgets[budgetKey] = {
        amount: 1000,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        month: currentMonth,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    console.log('Test budget created and saved:', budgets[budgetKey]);
    
    // Dispatch storage event to update homepage
    window.dispatchEvent(new StorageEvent('storage', {
        key: `budgets_${currentUser.id}`,
        newValue: JSON.stringify(budgets)
    }));
    
    // Update UI
    renderBudgets();
    
    return budgetKey;
}

// Handle budget form submission with enhanced validation
document.getElementById('addBudgetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('categorySelect').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    const selectedMonth = parseInt(document.getElementById('budgetMonth').value);
    
    console.log('Form submission - Category ID:', categoryId, 'Amount:', amount, 'Month:', selectedMonth);
    
    if (!categoryId || categoryId === '') {
        alert('Please select a category');
        return;
    }

    const category = categories.expense.find(c => c.id === categoryId);
    console.log('Found category:', category);
    
    if (!category) {
        alert('Invalid category selected');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
    }
    
    // Create a budget key that includes the month
    const budgetKey = `${categoryId}_${selectedMonth}`;
    
    // Create or update budget
    budgets[budgetKey] = {
        amount: amount,
        categoryId: categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        month: selectedMonth,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    console.log('Budget saved:', budgets[budgetKey]);
    console.log('All budgets:', budgets);
    
    // Dispatch storage event to update other tabs/windows
    try {
        window.dispatchEvent(new StorageEvent('storage', {
            key: `budgets_${currentUser.id}`,
            newValue: JSON.stringify(budgets)
        }));
        console.log('Dispatched storage event to update other tabs');
    } catch (error) {
        console.error('Error dispatching storage event:', error);
    }
    
    renderBudgets();
    modal.style.display = 'none';
    this.reset();
    
    // Set the month dropdown to the current month
    setCurrentMonth();
});

// Delete budget for a specific month
function deleteBudget(budgetKey) {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    delete budgets[budgetKey];
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    renderBudgets();
}

// Set the budget month dropdown to current month
function setCurrentMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const monthSelect = document.getElementById('budgetMonth');
    
    if (monthSelect) {
        monthSelect.value = currentMonth;
    }
}

// Render budgets for selected month or all months
function renderBudgets() {
    let totalBudget = 0;
    let totalSpent = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    
    categoryBudgets.innerHTML = '';
    let budgetsHtml = '';
    
    // Group budgets by category for display
    const categoryBudgetsMap = {};
    
    // Process all budgets
    Object.keys(budgets).forEach(budgetKey => {
        const budget = budgets[budgetKey];
        
        // Skip if this budget doesn't have the required data
        if (!budget.categoryId || !budget.categoryName) return;
        
        const category = categories.expense.find(c => c.id === budget.categoryId);
        if (!category) return;
        
        // Extract month from key or use stored month
        let budgetMonth = budget.month;
        if (budgetMonth === undefined && budgetKey.includes('_')) {
            budgetMonth = parseInt(budgetKey.split('_')[1]);
        }
        
        // Skip if month is not defined (should never happen with new format)
        if (budgetMonth === undefined) return;
        
        // Get spending for this category in the budget's month
        const spent = getCategorySpending(budget.categoryId, budgetMonth);
        const remaining = budget.amount - spent;
        const progress = (spent / budget.amount) * 100;
        
        totalBudget += budget.amount;
        totalSpent += spent;
        
        let progressClass = 'safe';
        if (progress >= 90) progressClass = 'danger';
        else if (progress >= 75) progressClass = 'warning';
        
        // Get month name
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = months[budgetMonth];
        
        budgetsHtml += `
            <div class="category-budget">
                <h3>
                    ${category.icon ? 
                      `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
                      ''
                    }
                    ${category.name} <span class="budget-month">(${monthName})</span>
                </h3>
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" 
                             style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <div class="budget-details">
                        <span>Spent: ${formatAmount(spent)}</span>
                        <span>Budget: ${formatAmount(budget.amount)}</span>
                    </div>
                </div>
                <div class="budget-actions">
                    <button onclick="deleteBudget('${budgetKey}')" 
                            class="btn-danger">Remove Budget</button>
                </div>
            </div>
        `;
    });
    
    categoryBudgets.innerHTML = budgetsHtml;
    
    // Update overview
    document.getElementById('totalBudget').textContent = formatAmount(totalBudget);
    document.getElementById('totalSpent').textContent = formatAmount(totalSpent);
    document.getElementById('remainingBudget').textContent = formatAmount(totalBudget - totalSpent);
}

// Calculate spending for a specific month
function getCategorySpending(categoryId, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    return transactions
        .filter(t => {
            const date = new Date(t.date);
            return t.categoryId === categoryId && 
                   date.getMonth() === month && 
                   date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
}

// Update progress bar colors based on theme
function updateProgressBarColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = {
        safe: isDark ? 'linear-gradient(to right, #059669, #34d399)' : 'linear-gradient(to right, #10b981, #34d399)',
        warning: isDark ? 'linear-gradient(to right, #d97706, #fbbf24)' : 'linear-gradient(to right, #f59e0b, #fbbf24)',
        danger: isDark ? 'linear-gradient(to right, #dc2626, #f87171)' : 'linear-gradient(to right, #ef4444, #f87171)'
    };

    document.documentElement.style.setProperty('--progress-safe', colors.safe);
    document.documentElement.style.setProperty('--progress-warning', colors.warning);
    document.documentElement.style.setProperty('--progress-danger', colors.danger);
}

// Add theme change listener
window.addEventListener('storage', (e) => {
    if (e.key === `theme_${currentUser.id}`) {
        updateProgressBarColors();
    }
});

// Add storage event listeners
window.addEventListener('storage', (e) => {
    if (e.key === `transactions_${currentUser.id}`) {
        transactions = JSON.parse(e.newValue) || [];
        renderBudgets();
    }
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Add debug button handler
const debugBudgetBtn = document.getElementById('debugBudgetBtn');
if (debugBudgetBtn) {
    debugBudgetBtn.addEventListener('click', function() {
        const budgetKey = createTestBudget();
        alert(`Created test budget with key: ${budgetKey}\nCheck the console for details and refresh your homepage to see if it appears.`);
    });
}

// Add repair budget button handler
const repairBudgetBtn = document.getElementById('repairBudgetBtn');
if (repairBudgetBtn) {
    repairBudgetBtn.addEventListener('click', function() {
        const repairedCount = repairBudgets();
        alert(`Repaired ${repairedCount} budget(s). Check the console for details and refresh your homepage to see the corrected budget display.`);
    });
}

// Add reset budget button handler
const resetBudgetBtn = document.getElementById('resetBudgetBtn');
if (resetBudgetBtn) {
    resetBudgetBtn.addEventListener('click', function() {
        if (confirm('⚠️ WARNING: This will delete ALL your budget data and cannot be undone. Are you sure you want to proceed?')) {
            // Clear all budgets
            budgets = {};
            localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
            console.log('All budget data has been reset');
            
            // Notify other windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: `budgets_${currentUser.id}`,
                newValue: JSON.stringify(budgets)
            }));
            
            // Refresh the UI
            renderBudgets();
            
            alert('All budget data has been reset. You can now create new budgets from scratch.');
        }
    });
}

// Initial progress bar color update
updateProgressBarColors();

// Set initial month to current month
setCurrentMonth();

// Initial render
renderBudgets();

// Add function to repair all budgets
function repairBudgets() {
    console.log('Repairing budgets...');
    console.log('Original budgets:', budgets);
    
    // Create a new budgets object
    const repairedBudgets = {};
    
    // Track latest budget entry for each category+month combination
    const latestBudgets = {};
    
    // First pass: identify latest budget for each category+month
    Object.keys(budgets).forEach(budgetKey => {
        const budget = budgets[budgetKey];
        
        // Skip invalid budgets
        if (!budget) return;
        
        // Extract the category ID and month
        let categoryId = budget.categoryId;
        let month = budget.month;
        
        // Try to extract from key if not available in budget object
        if (!categoryId && budgetKey.includes('_')) {
            const parts = budgetKey.split('_');
            if (parts.length >= 1) {
                categoryId = parts[0];
            }
        }
        
        if (month === undefined && budgetKey.includes('_')) {
            const parts = budgetKey.split('_');
            if (parts.length >= 2) {
                month = parseInt(parts[1]);
            }
        }
        
        // Skip if we couldn't determine category or month
        if (!categoryId || month === undefined) {
            console.log(`Skipping budget ${budgetKey}: can't determine category or month`);
            return;
        }
        
        // Check if amount exists and is valid
        let amount = budget.amount;
        if (typeof amount === 'string') {
            amount = parseFloat(amount);
        }
        
        if (isNaN(amount) || amount <= 0) {
            console.log(`Skipping budget ${budgetKey}: invalid amount`);
            return;
        }
        
        // Create a composite key for category+month
        const compositeKey = `${categoryId}_${month}`;
        
        // Check if we already have a budget for this category and month
        if (!latestBudgets[compositeKey] || 
            (budget.createdAt && latestBudgets[compositeKey].createdAt && 
             new Date(budget.createdAt) > new Date(latestBudgets[compositeKey].createdAt))) {
            // This is newer, replace it
            latestBudgets[compositeKey] = {
                budget: budget,
                categoryId: categoryId,
                month: month,
                amount: amount,
                budgetKey: budgetKey
            };
            console.log(`Found budget for ${compositeKey}:`, amount);
        }
    });
    
    // Second pass: create cleaned budget entries from the latest ones
    Object.keys(latestBudgets).forEach(compositeKey => {
        const entry = latestBudgets[compositeKey];
        const category = categories.expense.find(c => c.id === entry.categoryId);
        
        if (!category) {
            console.log(`Skipping composite key ${compositeKey}: category not found`);
            return;
        }
        
        // Create a clean budget object with the correct key format
        repairedBudgets[compositeKey] = {
            categoryId: entry.categoryId,
            categoryName: category.name,
            categoryIcon: category.icon,
            amount: entry.amount,
            month: entry.month,
            createdAt: entry.budget.createdAt || new Date().toISOString()
        };
        
        console.log(`Created clean budget for ${compositeKey}:`, repairedBudgets[compositeKey]);
    });
    
    // Log summary
    console.log(`Repaired ${Object.keys(repairedBudgets).length} budgets from ${Object.keys(budgets).length} original entries`);
    
    // Save the repaired budgets
    budgets = repairedBudgets;
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    console.log('Repaired budgets saved:', budgets);
    
    // Notify other windows
    window.dispatchEvent(new StorageEvent('storage', {
        key: `budgets_${currentUser.id}`,
        newValue: JSON.stringify(budgets)
    }));
    
    // Refresh the UI
    renderBudgets();
    
    return Object.keys(repairedBudgets).length;
}
