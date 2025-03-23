// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize theme
ThemeManager.init();

// ...existing code...

// Add theme-aware rendering
function renderCategories() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    incomeList.innerHTML = categories.income.map(category => `
        <div class="category-item ${isDark ? 'dark' : ''}">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<i class="fas fa-tag"></i>'
            }
            <span>${category.name}</span>
            <button onclick="deleteCategory('${category.id}', 'income')" class="btn-danger">Delete</button>
        </div>
    `).join('');
    
    expenseList.innerHTML = categories.expense.map(category => `
        <div class="category-item ${isDark ? 'dark' : ''}">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<i class="fas fa-tag"></i>'
            }
            <span>${category.name}</span>
            <button onclick="deleteCategory('${category.id}', 'expense')" class="btn-danger">Delete</button>
        </div>
    `).join('');
}

// Update on theme change
window.addEventListener('storage', (e) => {
    if (e.key === `theme_${currentUser.id}`) {
        renderCategories();
    }
});