// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// Initialize DOM elements
const modal = document.getElementById('categoryModal');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const closeModalBtn = document.getElementById('closeModal');
const incomeList = document.getElementById('incomeCategories');
const expenseList = document.getElementById('expenseCategories');

// Initialize categories data
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
    income: [],
    expense: []
};

// Show/hide modal
addCategoryBtn.onclick = () => modal.style.display = 'block';
closeModalBtn.onclick = () => modal.style.display = 'none';

// Handle category form submission
document.getElementById('addCategoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    const type = document.getElementById('categoryType').value;
    const iconFile = document.getElementById('categoryIcon').files[0];
    
    if (!name) {
        alert('Please enter a category name');
        return;
    }

    const category = {
        id: Date.now().toString(),
        name: name,
        icon: null
    };

    if (iconFile) {
        try {
            const base64Icon = await convertToBase64(iconFile);
            category.icon = base64Icon;
        } catch (error) {
            console.error('Error converting icon:', error);
        }
    }

    categories[type].push(category);
    localStorage.setItem(`categories_${currentUser.id}`, JSON.stringify(categories));
    
    this.reset();
    modal.style.display = 'none';
    renderCategories();
});

// Convert file to base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Delete category
function deleteCategory(categoryId, type) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    categories[type] = categories[type].filter(cat => cat.id !== categoryId);
    localStorage.setItem(`categories_${currentUser.id}`, JSON.stringify(categories));
    renderCategories();
}

// Render categories with theme support
function renderCategories() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    incomeList.innerHTML = categories.income.map(category => `
        <div class="category-item ${isDark ? 'dark' : ''}">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<i class="fas fa-tag"></i>'
            }
            <span class="category-name">${category.name}</span>
            <div class="category-actions">
                <button onclick="deleteCategory('${category.id}', 'income')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    expenseList.innerHTML = categories.expense.map(category => `
        <div class="category-item ${isDark ? 'dark' : ''}">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<i class="fas fa-tag"></i>'
            }
            <span class="category-name">${category.name}</span>
            <div class="category-actions">
                <button onclick="deleteCategory('${category.id}', 'expense')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Initial render
renderCategories();

// Update on theme change
window.addEventListener('storage', (e) => {
    if (e.key === `theme_${currentUser.id}`) {
        renderCategories();
    }
});

// Handle new transaction
document.getElementById('addTransactionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    try {
        const type = document.getElementById('transactionType').value;
        const amount = Math.abs(parseFloat(document.getElementById('amount').value)); // Ensure positive amount
        const description = document.getElementById('description').value.trim();
        const categoryId = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!type || isNaN(amount) || !description || !categoryId || !date) {
            alert('Please fill all fields correctly');
            return;
        }

        const category = categories[type].find(c => c.id === categoryId);
        if (!category) {
            alert('Invalid category selected');
            return;
        }

        const newTransaction = {
            id: Date.now().toString(),
            accountId: currentAccountId,
            userId: currentUser.id,
            type,
            amount,
            description,
            categoryId,
            categoryName: category.name,
            categoryIcon: category.icon,
            date,
            createdAt: new Date().toISOString()
        };

        // Update account balance
        const balanceChange = type === 'income' ? amount : -amount;
        currentAccount.balance = Number((currentAccount.balance + balanceChange).toFixed(2));

        // Update arrays
        accounts[accounts.findIndex(a => a.id === currentAccountId)] = currentAccount;
        allTransactions.push(newTransaction);
        transactions = allTransactions.filter(t => t.accountId === currentAccountId);

        // Save to localStorage
        localStorage.setItem(`accounts_${currentUser.id}`, JSON.stringify(accounts));
        localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(allTransactions));

        // Update displays
        renderAccountInfo();
        renderTransactions();
        
        // Trigger storage event for homepage update
        window.dispatchEvent(new Event('transactionsUpdated'));

        // Close modal and reset form
        modal.style.display = 'none';
        this.reset();

    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to add transaction. Please try again.');
    }
});