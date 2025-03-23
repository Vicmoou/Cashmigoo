class ThemeManager {
    static init() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;

        const theme = localStorage.getItem(`theme_${currentUser.id}`) || 'light';
        this.applyTheme(theme);
        this.initMobileMenu();
    }

    static applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            localStorage.setItem(`theme_${currentUser.id}`, theme);
        }
    }

    static initMobileMenu() {
        if (document.querySelector('.menu-toggle')) return;

        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(menuToggle);

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const toggleMenu = () => {
            const isActive = sidebar.classList.contains('active');
            sidebar.classList.toggle('active');
            document.body.classList.toggle('sidebar-active');
            menuToggle.innerHTML = isActive ? 
                '<i class="fas fa-bars"></i>' : 
                '<i class="fas fa-times"></i>';
        };

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
}

// Initialize once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}