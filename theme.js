/**
 * Theme Manager for Cashmigoo
 * Handles dark/light theme and authentication helpers
 */
const ThemeManager = {
    /**
     * Initialize the theme manager
     */
    init: function() {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        // Set theme based on user preference
        const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
        this.applyTheme(theme);
        
        console.log('ThemeManager initialized');
    },
    
    /**
     * Apply theme to document
     * @param {string} theme - 'dark' or 'light'
     */
    applyTheme: function(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.setAttribute('data-theme', 'light');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
    },
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme: function() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        localStorage.setItem(`theme_${currentUser.id}`, newTheme);
        this.applyTheme(newTheme);
    },
    
    /**
     * Handle user logout
     */
    logout: function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}; 