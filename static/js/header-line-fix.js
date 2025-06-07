/**
 * Header Line Removal
 * Completely removes logic for header line creation, update, and observation.
 * Keeps sidebar state tracking for layout class if needed.
 */

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const appContainer = document.querySelector('.app-container');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');

    if (!sidebar || !appContainer) return;

    // Only update container class for layout purposes, no header line logic
    function updateSidebarState() {
        const isSidebarCollapsed = sidebar.classList.contains('collapsed');

        if (isSidebarCollapsed) {
            appContainer.classList.add('sidebar-collapsed');
        } else {
            appContainer.classList.remove('sidebar-collapsed');
        }
    }

    // Initial state
    updateSidebarState();

    // Handle toggle button
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function () {
            setTimeout(updateSidebarState, 50);
        });
    }

    // Observe sidebar class changes
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.attributeName === 'class') {
                updateSidebarState();
            }
        });
    });

    observer.observe(sidebar, { attributes: true });

    // Handle window resize if layout depends on sidebar state
    window.addEventListener('resize', updateSidebarState);
});
