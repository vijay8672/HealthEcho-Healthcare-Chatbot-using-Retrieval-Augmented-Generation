// Initialize new chat icons based on current theme
document.addEventListener('DOMContentLoaded', function() {
    // Function to set the correct icon based on theme
    function setNewChatIcons() {
        const isDarkMode = document.body.classList.contains('theme-dark');
        const darkModeIconPath = '/static/img/new-chat-icon-dark-larger.svg'; // White circle with black plus
        const lightModeIconPath = '/static/img/new-chat-icon-larger.svg'; // Black circle with white plus

        console.log('Setting new chat icons for', isDarkMode ? 'dark' : 'light', 'mode');
        console.log('Dark mode icon path:', darkModeIconPath);
        console.log('Light mode icon path:', lightModeIconPath);

        // Set the icon for the sidebar new chat button
        const sidebarNewChatBtn = document.getElementById('newChatBtn');
        if (sidebarNewChatBtn) {
            const sidebarIcon = sidebarNewChatBtn.querySelector('img.new-chat-icon');
            if (sidebarIcon) {
                sidebarIcon.src = isDarkMode ? darkModeIconPath : lightModeIconPath;
                console.log('Initialized sidebar new chat icon for', isDarkMode ? 'dark' : 'light', 'mode');
            }
        }

        // Set the icon for the header new chat button
        const headerNewChatBtn = document.getElementById('headerNewChatBtn');
        if (headerNewChatBtn) {
            const headerIcon = headerNewChatBtn.querySelector('img.new-chat-icon');
            if (headerIcon) {
                headerIcon.src = isDarkMode ? darkModeIconPath : lightModeIconPath;
                console.log('Initialized header new chat icon for', isDarkMode ? 'dark' : 'light', 'mode');
            }
        }

        // Set the icon for the search modal
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            const searchModalIcons = searchModal.querySelectorAll('.new-chat-icon img');
            searchModalIcons.forEach(icon => {
                icon.src = isDarkMode ? darkModeIconPath : lightModeIconPath;
                icon.style.width = '24px';
                icon.style.height = '24px';
            });
            console.log('Initialized search modal new chat icons for', isDarkMode ? 'dark' : 'light', 'mode');
        }
    }

    // Set icons immediately
    setNewChatIcons();

    // Also listen for theme changes
    document.addEventListener('themeChanged', function(e) {
        console.log('Theme changed to', e.detail.theme, 'in init-new-chat-icons.js');

        // Force immediate update
        setTimeout(setNewChatIcons, 0);

        // Update again after a short delay to ensure it's applied
        setTimeout(setNewChatIcons, 100);

        // And once more after a longer delay to catch any late DOM updates
        setTimeout(setNewChatIcons, 300);
    });
});
