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
const transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];

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

// Handle budget form submission with enhanced validation
document.getElementById('addBudgetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('categorySelect').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    
    console.log('Form submission - Category ID:', categoryId, 'Amount:', amount);
    
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
    
    // Create or update budget
    budgets[categoryId] = {
        amount: amount,
        categoryName: category.name,
        categoryIcon: category.icon,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    console.log('Budget saved:', budgets[categoryId]);
    
    renderBudgets();
    modal.style.display = 'none';
    this.reset();
});

// Delete budget
function deleteBudget(categoryId) {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    delete budgets[categoryId];
    localStorage.setItem(`budgets_${currentUser.id}`, JSON.stringify(budgets));
    renderBudgets();
}

// Render budgets
function renderBudgets() {
    let totalBudget = 0;
    let totalSpent = 0;
    
    categoryBudgets.innerHTML = categories.expense.map(category => {
        const budget = budgets[category.id];
        if (!budget) return '';
        
        const spent = getCategorySpending(category.id);
        const remaining = budget.amount - spent;
        const progress = (spent / budget.amount) * 100;
        
        totalBudget += budget.amount;
        totalSpent += spent;
        
        let progressClass = 'safe';
        if (progress >= 90) progressClass = 'danger';
        else if (progress >= 75) progressClass = 'warning';
        
        return `
            <div class="category-budget">
                <h3>
                    ${category.icon ? 
                      `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
                      ''
                    }
                    ${category.name}
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
                    <button onclick="deleteBudget('${category.id}')" 
                            class="btn-danger">Remove Budget</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Update overview
    document.getElementById('totalBudget').textContent = formatAmount(totalBudget);
    document.getElementById('totalSpent').textContent = formatAmount(totalSpent);
    document.getElementById('remainingBudget').textContent = formatAmount(totalBudget - totalSpent);
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

// Initial progress bar color update
updateProgressBarColors();

// Initial render
renderBudgets();
