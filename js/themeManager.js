class ThemeManager {
    static init() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) return;

            const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
            this.applyTheme(theme);
            this.setupMobileMenu();
            
            // Setup system theme detection
            if (theme === 'system') {
                this.setupSystemThemeDetection();
            }

            // Listen for theme changes
            window.addEventListener('storage', (e) => {
                if (e.key === `theme_${currentUser.id}`) {
                    this.applyTheme(e.newValue);
                }
            });
        } catch (error) {
            console.error('Theme initialization error:', error);
        }
    }

    static applyTheme(theme) {
        // Remove all theme classes first
        document.body.classList.remove('light', 'dark', 'system');
        
        let effectiveTheme = theme;
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', effectiveTheme);
        document.body.classList.add(theme);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            localStorage.setItem(`theme_${currentUser.id}`, theme);
        }
    }

    static setupSystemThemeDetection() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const currentTheme = localStorage.getItem(`theme_${JSON.parse(localStorage.getItem('currentUser')).id}`);
            if (currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    }

    static setupMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.querySelector('.menu-toggle')) return;

        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(menuToggle);

        menuToggle.onclick = () => {
            sidebar.classList.toggle('active');
            menuToggle.innerHTML = sidebar.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        };
    }

    static logout() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            // Clear all user-specific data
            const userKeys = [
                `theme_${currentUser.id}`,
                `currency_${currentUser.id}`,
                `transactions_${currentUser.id}`,
                `categories_${currentUser.id}`,
                `accounts_${currentUser.id}`,
                `budgets_${currentUser.id}`,
                `debts_${currentUser.id}`
            ];
            
            userKeys.forEach(key => localStorage.removeItem(key));
        }

        // Clear session data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentAccount');
        sessionStorage.clear();
        
        // Redirect to login
        window.location.replace('login.html');
    }
}

// Initialize theme system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}