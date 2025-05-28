/**
 * Hide Welcome Message For Logged-In Users
 * This script runs immediately to hide the welcome message for logged-in users
 * before any other scripts or DOM content loads
 */

// Run immediately before DOM content loads
(function() {
    try {
        // Check if user is already logged in
        const isLoggedIn = !!localStorage.getItem('user_data');
        
        if (isLoggedIn) {
            // Add style to immediately hide welcome container for logged-in users
            const style = document.createElement('style');
            style.textContent = `
                .welcome-container {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    transition: none !important;
                    animation: none !important;
                }
                
                html.logged-in .welcome-container,
                body.logged-in .welcome-container,
                .logged-in .welcome-container {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                
                .not-logged-in-only {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            `;
            document.head.appendChild(style);
            
            // Set a flag to indicate that welcome message should be hidden
            window.hideWelcomeMessage = true;
            
            console.log('Added immediate style to hide welcome message for logged-in users');
        }
    } catch (error) {
        console.error('Error in immediate welcome message hiding:', error);
    }
})();

// Also run when DOM is loaded to ensure welcome message is hidden
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if user is logged in
        const isLoggedIn = !!localStorage.getItem('user_data');
        
        if (isLoggedIn) {
            // Find all welcome containers and hide them
            const welcomeContainers = document.querySelectorAll('.welcome-container');
            welcomeContainers.forEach(container => {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
                
                // Remove from DOM to ensure it doesn't reappear
                setTimeout(() => {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 0);
            });
            
            console.log('Removed welcome containers on DOMContentLoaded for logged-in users');
            
            // Add the welcome-removed class to body
            document.body.classList.add('welcome-removed');
        }
    } catch (error) {
        console.error('Error hiding welcome message on DOMContentLoaded:', error);
    }
});

// Create a MutationObserver to immediately hide welcome containers for logged-in users
(function() {
    try {
        // Check if user is logged in
        const isLoggedIn = !!localStorage.getItem('user_data');
        
        if (isLoggedIn) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        for (let i = 0; i < mutation.addedNodes.length; i++) {
                            const node = mutation.addedNodes[i];
                            if (node.nodeType === 1) { // Element node
                                // Check if this is a welcome container or contains one
                                if (node.classList && node.classList.contains('welcome-container')) {
                                    node.style.display = 'none';
                                    node.style.visibility = 'hidden';
                                    node.style.opacity = '0';
                                    
                                    // Remove from DOM
                                    setTimeout(() => {
                                        if (node.parentNode) {
                                            node.parentNode.removeChild(node);
                                        }
                                    }, 0);
                                } else if (node.querySelectorAll) {
                                    const welcomeContainers = node.querySelectorAll('.welcome-container');
                                    welcomeContainers.forEach(container => {
                                        container.style.display = 'none';
                                        container.style.visibility = 'hidden';
                                        container.style.opacity = '0';
                                        
                                        // Remove from DOM
                                        setTimeout(() => {
                                            if (container.parentNode) {
                                                container.parentNode.removeChild(container);
                                            }
                                        }, 0);
                                    });
                                }
                            }
                        }
                    }
                });
            });
            
            // Start observing the document with the configured parameters
            observer.observe(document.documentElement, { childList: true, subtree: true });
            
            console.log('MutationObserver set up to hide welcome containers for logged-in users');
        }
    } catch (error) {
        console.error('Error setting up MutationObserver for welcome containers:', error);
    }
})();
