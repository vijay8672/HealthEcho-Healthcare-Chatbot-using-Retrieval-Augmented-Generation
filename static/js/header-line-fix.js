/**
 * Header Line Fix
 * Ensures the header line is properly shown/hidden when the sidebar state changes
 * Matches ChatGPT's UI behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const sidebar = document.getElementById('sidebar');
    const appContainer = document.querySelector('.app-container');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');

    // Function to ensure the line is properly attached to the sidebar
    function ensureHeaderLine() {
        // If the sidebar doesn't have the ::after pseudo-element, we need to add a real element
        if (!sidebar) return;

        // Check if we already added a header line element
        let headerLine = document.getElementById('header-line-element');

        if (!headerLine) {
            // Create a header line element
            headerLine = document.createElement('div');
            headerLine.id = 'header-line-element';
            headerLine.style.position = 'absolute';
            headerLine.style.top = 'var(--header-height)';
            headerLine.style.left = '0';
            headerLine.style.width = '100%';
            headerLine.style.height = '1px';
            headerLine.style.backgroundColor = 'var(--border-color)';
            headerLine.style.zIndex = '10';
            headerLine.style.transition = 'all 0.3s ease';

            // Add it to the sidebar
            sidebar.appendChild(headerLine);
        }

        // Update visibility based on sidebar state
        updateHeaderLine();
    }

    // Function to update header line visibility
    function updateHeaderLine() {
        if (!sidebar) return;

        const isSidebarCollapsed = sidebar.classList.contains('collapsed');
        const headerLine = document.getElementById('header-line-element');

        if (headerLine) {
            if (isSidebarCollapsed) {
                headerLine.style.opacity = '0';
                headerLine.style.visibility = 'hidden';
            } else {
                headerLine.style.opacity = '1';
                headerLine.style.visibility = 'visible';
            }
        }

        // Also update the app container class for CSS selectors
        if (isSidebarCollapsed) {
            appContainer.classList.add('sidebar-collapsed');
        } else {
            appContainer.classList.remove('sidebar-collapsed');
        }
    }

    // Initial setup
    ensureHeaderLine();

    // Listen for sidebar toggle clicks
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            // Wait for the sidebar class to be updated
            setTimeout(updateHeaderLine, 50);
        });
    }

    // Listen for class changes on the sidebar
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                updateHeaderLine();
            }
        });
    });

    // Start observing the sidebar
    if (sidebar) {
        observer.observe(sidebar, { attributes: true });
    }

    // Also update on window resize
    window.addEventListener('resize', updateHeaderLine);
});
