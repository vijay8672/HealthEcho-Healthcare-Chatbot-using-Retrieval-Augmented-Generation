/**
 * Prevent Login Popup Script
 * This script prevents the login modal from automatically appearing on page refresh
 */

// Run immediately before any other scripts
(function() {
    try {
        // Store a flag to indicate if this is a page refresh
        const isPageRefresh = performance.navigation && 
                             (performance.navigation.type === 1 || 
                              window.performance.getEntriesByType('navigation')[0].type === 'reload');
        
        // Store this information in sessionStorage
        if (isPageRefresh) {
            sessionStorage.setItem('is_page_refresh', 'true');
            console.log('Page refresh detected, preventing automatic login popup');
        } else {
            sessionStorage.removeItem('is_page_refresh');
        }
        
        // Add a style to ensure login modal is hidden on page load
        const style = document.createElement('style');
        style.textContent = `
            #loginModal, #registerModal {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // Remove the style after a short delay to allow normal operation
        setTimeout(() => {
            style.remove();
            console.log('Removed temporary login modal hiding style');
        }, 500);
    } catch (error) {
        console.error('Error in prevent-login-popup script:', error);
    }
})();

// When DOM is loaded, ensure login modal is properly hidden
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get login and register modals
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        // Ensure they're hidden
        if (loginModal) loginModal.style.display = 'none';
        if (registerModal) registerModal.style.display = 'none';
        
        // Clear the page refresh flag after a short delay
        setTimeout(() => {
            sessionStorage.removeItem('is_page_refresh');
        }, 2000);
        
        console.log('Login and register modals hidden on page load');
    } catch (error) {
        console.error('Error hiding login modals on DOMContentLoaded:', error);
    }
});
