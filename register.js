document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    
    if (!form) {
        console.error('Register form not found!');
        return;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        try {
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                alert('All fields are required');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }

            // Safely get existing users
            let users = [];
            try {
                const storedUsers = localStorage.getItem('users');
                if (storedUsers) {
                    users = JSON.parse(storedUsers);
                    // Ensure users is an array
                    if (!Array.isArray(users)) {
                        users = [];
                    }
                }
            } catch (error) {
                console.error('Error parsing users:', error);
                users = [];
            }

            // Check for existing email using traditional loop for safety
            const emailExists = users.length > 0 && users.find(user => user.email === email);
            if (emailExists) {
                alert('Email already registered');
                return;
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name: name,
                email: email,
                password: password,
                createdAt: new Date().toISOString()
            };

            // Save user
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(newUser));

            // Initialize user data
            localStorage.setItem(`accounts_${newUser.id}`, JSON.stringify([]));
            localStorage.setItem(`transactions_${newUser.id}`, JSON.stringify([]));
            localStorage.setItem(`categories_${newUser.id}`, JSON.stringify({
                income: [],
                expense: []
            }));
            localStorage.setItem(`budgets_${newUser.id}`, JSON.stringify({}));
            localStorage.setItem(`debts_${newUser.id}`, JSON.stringify([]));

            console.log('Registration successful');
            window.location.href = 'homepage.html';

        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        }
    });
});
