/**
 * Header Controls
 * Handles the functionality of the header new chat button
 * that appears when the sidebar is collapsed
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const sidebar = document.getElementById('sidebar');
    const headerNewChatBtn = document.getElementById('headerNewChatBtn');

    // Function to start a new chat
    function startNewChat() {
        // Check if we have a global new chat handler
        if (window.newChatHandler && typeof window.newChatHandler.startNewChat === 'function') {
            window.newChatHandler.startNewChat();
        } else if (typeof window.startNewChat === 'function') {
            // Fallback to global function
            window.startNewChat();
        } else {
            console.error('No new chat handler found');
        }
    }

    // Update the new chat button icon based on the current theme
    function updateNewChatButtonIcon() {
        if (!headerNewChatBtn) return;

        const isDarkMode = document.body.classList.contains('theme-dark');
        const iconImg = headerNewChatBtn.querySelector('img.new-chat-icon');

        if (iconImg) {
            // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
            // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
            iconImg.src = isDarkMode
                ? '/static/img/new-chat-icon-dark-larger.svg'
                : '/static/img/new-chat-icon-larger.svg';

            console.log('Header new chat icon updated for theme:', isDarkMode ? 'dark' : 'light');
        }
    }

    // Add event listener to new chat button
    if (headerNewChatBtn) {
        headerNewChatBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            startNewChat();
        });

        // Initialize the icon based on current theme
        updateNewChatButtonIcon();
    }

    // Function to update new chat button visibility based on sidebar state
    function updateNewChatButtonVisibility() {
        if (!sidebar || !headerNewChatBtn) return;

        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            headerNewChatBtn.style.display = 'flex';
        } else {
            headerNewChatBtn.style.display = 'none';
        }
    }

    // Initial update
    updateNewChatButtonVisibility();

    // Listen for sidebar class changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                updateNewChatButtonVisibility();
            }
        });
    });

    // Start observing the sidebar
    if (sidebar) {
        observer.observe(sidebar, { attributes: true });
    }

    // Also update on window resize
    window.addEventListener('resize', updateNewChatButtonVisibility);

    // Listen for theme changes
    document.addEventListener('themeChanged', function(e) {
        console.log('Theme changed event received in header-controls.js');
        // Force immediate update of the icon
        setTimeout(updateNewChatButtonIcon, 0);

        // Update again after a short delay to ensure it's applied
        setTimeout(updateNewChatButtonIcon, 100);
    });

    console.log('Header new chat button initialized');
});
