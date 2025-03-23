// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Load user information
document.getElementById('userName').textContent = currentUser.name;
document.getElementById('userEmail').textContent = currentUser.email;
document.getElementById('memberSince').textContent = new Date(currentUser.createdAt).toLocaleDateString();

// Theme handling
const themeSelector = document.getElementById('themeSelector');
const colorButtons = document.querySelectorAll('.color-btn');
let currentTheme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
let currentAccentColor = localStorage.getItem(`accent_${currentUser.id}`) || '#6366f1';

// Initialize theme and accent color (simplified)
document.documentElement.setAttribute('data-theme', currentTheme);
themeSelector.value = currentTheme;

// Theme selector event listener
themeSelector.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    ThemeManager.applyTheme(newTheme);
    window.dispatchEvent(new StorageEvent('storage', {
        key: `theme_${currentUser.id}`,
        newValue: newTheme
    }));
});

// Currency handling
const currencySelector = document.getElementById('currencySelector');
currencySelector.value = localStorage.getItem(`currency_${currentUser.id}`) || 'USD';

currencySelector.addEventListener('change', function(e) {
    const newCurrency = e.target.value;
    localStorage.setItem(`currency_${currentUser.id}`, newCurrency);
    alert('Currency updated successfully! Changes will apply across all pages.');
});

// Color buttons event listeners
colorButtons.forEach(btn => {
    const color = btn.dataset.color;
    btn.style.backgroundColor = color;
    
    if (color === currentAccentColor) {
        btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => {
        const newColor = btn.dataset.color;
        document.documentElement.style.setProperty('--primary-color', newColor);
        localStorage.setItem(`accent_${currentUser.id}`, newColor);
        
        colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Edit profile button handler
document.getElementById('editProfileBtn').addEventListener('click', () => {
    alert('Profile editing will be implemented soon!');
});

// Initialize theme on page load
ThemeManager.init();
