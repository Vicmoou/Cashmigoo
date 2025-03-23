class ThemeManager {
    static init() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
        
        // Apply theme immediately
        this.applyTheme(theme);

        // Listen for theme changes
        window.addEventListener('storage', (e) => {
            if (e.key === `theme_${currentUser.id}`) {
                this.applyTheme(e.newValue);
            }
        });

        this.initMobileMenu();
    }

    static applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = theme;
        localStorage.setItem(`theme_${JSON.parse(localStorage.getItem('currentUser')).id}`, theme);
    }

    static initMobileMenu() {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(menuToggle);

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            document.body.classList.toggle('sidebar-active');
            menuToggle.innerHTML = sidebar.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Prevent closing when clicking inside sidebar
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
}

// Initialize theme system
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());