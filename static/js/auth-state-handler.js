/**
 * Auth State Handler
 * This script runs immediately to set the correct authentication state
 * before any other scripts or DOM content loads
 */

// Apply authentication state immediately
(function() {
    try {
        // Check if user is already logged in
        const isLoggedIn = !!localStorage.getItem('user_data');

        // Set html and body class based on login state immediately
        if (isLoggedIn) {
            document.documentElement.classList.add('logged-in');
            document.documentElement.classList.remove('not-logged-in');

            // Add style to immediately hide welcome container for logged-in users
            const style = document.createElement('style');
            style.textContent = `
                html.logged-in .welcome-container,
                body.logged-in .welcome-container {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.documentElement.classList.add('not-logged-in');
            document.documentElement.classList.remove('logged-in');
        }

        // Also set body class if it's available
        if (document.body) {
            if (isLoggedIn) {
                document.body.classList.add('logged-in');
                document.body.classList.remove('not-logged-in');
            } else {
                document.body.classList.add('not-logged-in');
                document.body.classList.remove('logged-in');
            }
        }

        // Create a MutationObserver to immediately hide welcome containers for logged-in users
        if (isLoggedIn) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        for (let i = 0; i < mutation.addedNodes.length; i++) {
                            const node = mutation.addedNodes[i];
                            if (node.nodeType === 1) { // Element node
                                // Check if this is a welcome container or contains one
                                const welcomeContainers = node.classList && node.classList.contains('welcome-container') ?
                                    [node] : node.querySelectorAll ? node.querySelectorAll('.welcome-container') : [];

                                if (welcomeContainers.length > 0) {
                                    welcomeContainers.forEach(container => {
                                        container.style.display = 'none';
                                        container.remove();
                                    });
                                }
                            }
                        }
                    }
                });
            });

            // Start observing the document with the configured parameters
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    } catch (error) {
        console.error('Error applying initial auth state:', error);
    }
})();
