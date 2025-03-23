// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Initialize categories
let categories = JSON.parse(localStorage.getItem(`categories_${currentUser.id}`)) || {
    income: [],
    expense: []
};

// DOM Elements
const modal = document.getElementById('categoryModal');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const closeModalBtn = document.getElementById('closeModal');
const incomeList = document.getElementById('incomeCategories');
const expenseList = document.getElementById('expenseCategories');

// Show/hide modal
addCategoryBtn.onclick = () => modal.style.display = 'block';
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Handle category creation
document.getElementById('addCategoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const name = document.getElementById('categoryName').value.trim();
        const type = document.getElementById('categoryType').value;
        const iconFile = document.getElementById('categoryIcon').files[0];
        
        let iconData = null;
        if (iconFile) {
            iconData = await convertImageToBase64(iconFile);
        }
        
        const newCategory = {
            id: Date.now().toString(),
            name: name,
            icon: iconData,
            createdAt: new Date().toISOString()
        };
        
        // Add to categories array
        categories[type].push(newCategory);
        
        // Save to localStorage
        localStorage.setItem(`categories_${currentUser.id}`, JSON.stringify(categories));
        console.log('Category saved:', newCategory);
        
        // Update display
        renderCategories();
        modal.style.display = 'none';
        this.reset();
        
    } catch (error) {
        console.error('Error adding category:', error);
        alert('Failed to add category. Please try again.');
    }
});

// Convert image to base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Delete category
function deleteCategory(categoryId, type) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }
    
    categories[type] = categories[type].filter(c => c.id !== categoryId);
    localStorage.setItem(`categories_${currentUser.id}`, JSON.stringify(categories));
    renderCategories();
}

// Render categories
function renderCategories() {
    // Render income categories
    incomeList.innerHTML = categories.income.map(category => `
        <div class="category-item">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<div class="category-icon-placeholder"></div>'
            }
            <span class="category-name">${category.name}</span>
            <div class="category-actions">
                <button onclick="deleteCategory('${category.id}', 'income')" 
                        class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('') || '<p>No income categories yet</p>';

    // Render expense categories
    expenseList.innerHTML = categories.expense.map(category => `
        <div class="category-item">
            ${category.icon ? 
              `<img src="${category.icon}" class="category-icon" alt="${category.name}">` : 
              '<div class="category-icon-placeholder"></div>'
            }
            <span class="category-name">${category.name}</span>
            <div class="category-actions">
                <button onclick="deleteCategory('${category.id}', 'expense')" 
                        class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('') || '<p>No expense categories yet</p>';
}

// Initial render
renderCategories();
