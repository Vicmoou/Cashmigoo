class ThemeManager {
    static init() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) return;

            const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
            this.applyTheme(theme);
            this.setupMobileMenu();
        } catch (error) {
            console.error('Theme initialization error:', error);
        }
    }

    static applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = theme;
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
}

// Initialize once
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ThemeManager.init.bind(ThemeManager));
} else {
    ThemeManager.init();
}