document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Initialize all user data stores
        const stores = [
            `accounts_${user.id}`,
            `transactions_${user.id}`,
            `categories_${user.id}`,
            `budgets_${user.id}`,
            `debts_${user.id}`
        ];

        stores.forEach(store => {
            if (!localStorage.getItem(store)) {
                const initialValue = store.includes('budgets') ? '{}' : '[]';
                localStorage.setItem(store, initialValue);
            }
        });

        window.location.href = 'homepage.html';
    } else {
        alert('Invalid email or password');
    }
});
