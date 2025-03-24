// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize data
let shoppingItems = JSON.parse(localStorage.getItem(`shopping_items_${currentUser.id}`)) || [];
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
    expense: []
};
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser.id}`)) || [];

// DOM Elements
const modal = document.getElementById('shoppingModal');
const addItemBtn = document.getElementById('addItemBtn');
const closeModalBtn = document.getElementById('closeModal');
const shoppingList = document.getElementById('shoppingList');

// Show/hide modal
addItemBtn.onclick = () => {
    modal.style.display = 'block';
    updateCategoryOptions();
    updateAccountOptions();
};
closeModalBtn.onclick = () => {
    modal.style.display = 'none';
    document.getElementById('addShoppingForm').reset();
};

// Format amount
function formatAmount(amount) {
    const userCurrency = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';
    const symbols = { USD: '$', EUR: '€', AOA: 'Kz', BRL: 'R$' };
    return `${symbols[userCurrency]} ${Number(amount).toFixed(2)}`;
}

// Update category options
function updateCategoryOptions() {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">Select a category</option>';
    
    categories.expense.forEach(cat => {
        const option = new Option(cat.name, cat.id);
        option.dataset.icon = cat.icon;
        categorySelect.appendChild(option);
    });
}

// Update account options
function updateAccountOptions() {
    const accountSelect = document.getElementById('account');
    accountSelect.innerHTML = '<option value="">Select an account</option>';
    
    accounts.forEach(account => {
        const option = new Option(account.name, account.id);
        accountSelect.appendChild(option);
    });
}

// Handle new shopping item
document.getElementById('addShoppingForm').addEventListener('submit', function(e) {
    e.preventDefault();

    try {
        const categoryId = document.getElementById('category').value;
        const category = categories.expense.find(c => c.id === categoryId);
        
        const newItem = {
            id: Date.now().toString(),
            userId: currentUser.id,
            title: document.getElementById('title').value.trim(),
            amount: parseFloat(document.getElementById('amount').value),
            categoryId: categoryId,
            categoryName: category.name,
            categoryIcon: category.icon,
            priority: document.getElementById('priority').value,
            plannedDate: document.getElementById('plannedDate').value,
            notes: document.getElementById('notes').value.trim(),
            accountId: document.getElementById('account').value,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        shoppingItems.push(newItem);
        localStorage.setItem(`shopping_items_${currentUser.id}`, JSON.stringify(shoppingItems));
        
        renderShoppingList();
        modal.style.display = 'none';
        this.reset();

    } catch (error) {
        console.error('Error adding shopping item:', error);
        alert('Failed to add item. Please try again.');
    }
});

// Add click outside listener to close modal
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        document.getElementById('addShoppingForm').reset();
    }
});

// Delete shopping item
function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this shopping item?')) return;
    
    shoppingItems = shoppingItems.filter(e => e.id !== id);
    localStorage.setItem(`shopping_items_${currentUser.id}`, JSON.stringify(shoppingItems));
    renderShoppingList();
}

// Mark as completed
function markAsCompleted(id) {
    const item = shoppingItems.find(e => e.id === id);
    if (!item) return;

    const account = accounts.find(a => a.id === item.accountId);
    if (!account) {
        alert('Associated account not found!');
        return;
    }

    // Create transaction with userId
    const transaction = {
        id: Date.now().toString(),
        userId: currentUser.id,  // Add this line
        accountId: item.accountId,
        type: 'expense',
        amount: item.amount,
        description: item.title,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,  // Add this line
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };

    // Update account balance
    account.balance -= item.amount;

    // Update expenditure status
    item.status = 'completed';
    item.completedAt = new Date().toISOString();

    // Save all changes
    let transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
    transactions.push(transaction);
    
    localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
    localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
    localStorage.setItem(`shopping_items_${currentUser.id}`, JSON.stringify(shoppingItems));
    
    // Dispatch events for real-time updates
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('transactionsUpdated'));
    
    renderShoppingList();
}

// Render shopping list
function renderShoppingList() {
    shoppingList.innerHTML = shoppingItems
        .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate))
        .map(item => `
            <div class="shopping-item">
                <div class="item-info">
                    <div class="item-title">
                        ${item.categoryIcon ? 
                          `<img src="${item.categoryIcon}" class="category-icon" alt="${item.categoryName}">` : 
                          ''}
                        ${item.title}
                        <span class="priority-badge priority-${item.priority}">
                            ${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </span>
                    </div>
                    <div class="item-meta">
                        <span class="item-category">${item.categoryName}</span>
                        <span class="item-date">Planned: ${new Date(item.plannedDate).toLocaleDateString()}</span>
                        ${item.status === 'completed' ? 
                          `<span class="item-completed">Completed: ${new Date(item.completedAt).toLocaleDateString()}</span>` : 
                          ''}
                    </div>
                    ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                </div>
                <div class="item-amount">
                    ${formatAmount(item.amount)}
                </div>
                <div class="item-actions">
                    ${item.status === 'pending' ? 
                      `<button onclick="markAsCompleted('${item.id}')" class="btn-primary">
                        <i class="fas fa-check-circle"></i>
                        <span>Complete</span>
                      </button>` : 
                      ''}
                    <button onclick="deleteItem('${item.id}')" class="btn-danger">
                        <i class="fas fa-trash-alt"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        `).join('') || '<div class="no-items">No shopping items yet</div>';
}

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    ThemeManager.logout();
});

// Initialize
renderShoppingList();