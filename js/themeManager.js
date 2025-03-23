class ThemeManager {
    static init() {
        if (!document.querySelector('.sidebar')) return;
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        // Get theme from localStorage
        const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
        this.applyTheme(theme);
        
        // Listen for theme changes from other pages
        window.addEventListener('storage', (e) => {
            if (e.key === `theme_${currentUser.id}`) {
                this.applyTheme(e.newValue);
            }
        });

        this.initMobileMenu();
    }

    static applyTheme(theme) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        // Remove all theme classes
        document.documentElement.classList.remove('light', 'dark');
        document.body.classList.remove('light', 'dark');
        
        // Apply new theme
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.add(theme);
        document.body.classList.add(theme);
        
        // Store theme preference
        localStorage.setItem(`theme_${currentUser.id}`, theme);
        
        // Broadcast theme change to other pages
        window.dispatchEvent(new StorageEvent('storage', {
            key: `theme_${currentUser.id}`,
            newValue: theme
        }));
    }

    static initMobileMenu() {
        // Only create menu toggle if it doesn't exist
        if (document.querySelector('.menu-toggle')) return;

        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(menuToggle);

        const sidebar = document.querySelector('.sidebar');
        
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            menuToggle.innerHTML = sidebar.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });
    }
}

// Initialize once DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
window.addEventListener('load', () => ThemeManager.init());