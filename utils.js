/**
 * Cashmigo Mobile Utilities
 * This file contains shared utility functions for mobile responsiveness
 */

const MobileUtils = {
    /**
     * Initialize mobile functionality
     * Call this function on each page that needs mobile support
     */
    init: function() {
        this.setupMobileMenu();
        this.setupModalPositioning();
        this.setupResponsiveListeners();
    },

    /**
     * Set up the mobile menu toggle functionality
     */
    setupMobileMenu: function() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            // Toggle menu when button is clicked
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    !e.target.closest('.sidebar') && 
                    !e.target.closest('.menu-toggle') &&
                    sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            });
            
            // Close menu when a link is clicked on mobile
            const navLinks = sidebar.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('active');
                    }
                });
            });
        }
    },
    
    /**
     * Set up proper modal positioning for mobile devices
     */
    setupModalPositioning: function() {
        const adjustModalPosition = () => {
            const modals = document.querySelectorAll('.modal-content');
            if (window.innerWidth <= 768) {
                modals.forEach(modal => {
                    modal.style.maxHeight = (window.innerHeight * 0.8) + 'px';
                    modal.style.overflow = 'auto';
                });
            } else {
                modals.forEach(modal => {
                    modal.style.maxHeight = '';
                    modal.style.overflow = '';
                });
            }
        };
        
        adjustModalPosition();
        window.addEventListener('resize', adjustModalPosition);
    },
    
    /**
     * Set up general responsive behavior listeners
     */
    setupResponsiveListeners: function() {
        // Add viewport height fix for mobile browsers
        const setMobileHeight = () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        };
        
        setMobileHeight();
        window.addEventListener('resize', setMobileHeight);
        window.addEventListener('orientationchange', setMobileHeight);
    }
};

// Expose to global scope
window.MobileUtils = MobileUtils;


