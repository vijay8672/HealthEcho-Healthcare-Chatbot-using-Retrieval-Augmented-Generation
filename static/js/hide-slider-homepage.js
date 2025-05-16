// Script to ensure the theme toggle is always visible
document.addEventListener('DOMContentLoaded', function() {
    // Get the theme toggle element
    const themeToggle = document.querySelector('.header-theme-toggle');

    // Always show the theme toggle
    if (themeToggle) {
        themeToggle.style.display = 'flex';
        console.log('Theme toggle is now visible on all pages');
    }
});
