/**
 * Remove Welcome Message After Login
 * This script removes the welcome message after a user logs in
 */

// Run immediately before DOM content loads to prevent welcome message flash
(function() {
    try {
        // Check if user is logged in
        const isLoggedIn = !!localStorage.getItem('user_data');

        if (isLoggedIn) {
            // Add CSS to immediately hide welcome containers
            const style = document.createElement('style');
            style.textContent = `
                html.logged-in .welcome-container,
                body.logged-in .welcome-container {
                    display: none !important;
                }

                .welcome-container {
                    transition: none !important;
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    } catch (error) {
        console.error('Error in immediate welcome message removal:', error);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const isLoggedIn = !!localStorage.getItem('user_data');

    if (isLoggedIn) {
        // Remove welcome message if user is logged in
        removeWelcomeMessage();

        // Also listen for login events to remove welcome message
        window.addEventListener('user-logged-in', () => {
            // Remove immediately and then again after a short delay to catch any that might be added
            removeWelcomeMessage();
            setTimeout(removeWelcomeMessage, 100);
            setTimeout(removeWelcomeMessage, 500);
        });

        // Set up a MutationObserver to catch any welcome containers that might be added dynamically
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a welcome container or contains one
                            if (node.classList && node.classList.contains('welcome-container')) {
                                node.style.display = 'none';
                                node.remove();
                            } else if (node.querySelectorAll) {
                                const welcomeContainers = node.querySelectorAll('.welcome-container');
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

        // Start observing the document
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Function to remove welcome message
    function removeWelcomeMessage() {
        // Find all welcome containers (there might be more than one)
        const welcomeContainers = document.querySelectorAll('.welcome-container');

        if (welcomeContainers.length > 0) {
            welcomeContainers.forEach(container => {
                container.style.display = 'none'; // Hide immediately
                container.remove(); // Then remove from DOM
                console.log('Welcome container removed after login');
            });

            // Add the welcome-removed class to body
            document.body.classList.add('welcome-removed');

            // Reposition the chat input to the bottom
            const chatInputContainer = document.querySelector('.chat-input-container');
            if (chatInputContainer) {
                chatInputContainer.style.position = 'fixed';
                chatInputContainer.style.top = 'auto';
                chatInputContainer.style.bottom = '24px';
                chatInputContainer.style.transform = 'translate(-50%, 0)';
                chatInputContainer.style.left = '50%';
                chatInputContainer.style.marginLeft = '0';
                chatInputContainer.style.right = 'auto';
            }
        }
    }

    // Run immediately and then again after a short delay
    if (isLoggedIn) {
        removeWelcomeMessage();
        setTimeout(removeWelcomeMessage, 100);
        setTimeout(removeWelcomeMessage, 500);
    }
});
