/**
 * Mobile Utilities for Cashmigoo
 * Provides mobile-specific features and optimizations
 */
const MobileUtils = {
    /**
     * Initialize mobile utilities
     */
    init: function() {
        // Check if we're on a mobile device
        const isMobile = window.innerWidth <= 768;
        console.log('Mobile device detected:', isMobile);
        
        // Add mobile-specific event listeners
        this.setupEventListeners();
        
        console.log('MobileUtils initialized');
    },
    
    /**
     * Set up mobile-specific event listeners
     */
    setupEventListeners: function() {
        // Handle the add transaction button
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                window.location.href = 'transactions.html';
            });
        }
        
        // Add theme toggle functionality
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (typeof ThemeManager !== 'undefined') {
                    ThemeManager.toggleTheme();
                }
            });
        }
    }
}; 