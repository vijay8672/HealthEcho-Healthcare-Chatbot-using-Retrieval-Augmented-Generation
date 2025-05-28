// Script to ensure the theme toggle is always hidden (only available in settings)
document.addEventListener('DOMContentLoaded', function() {
    // Get the theme toggle element
    const themeToggle = document.querySelector('.header-theme-toggle');

    // Always hide the theme toggle (it's only available in settings now)
    if (themeToggle) {
        themeToggle.style.display = 'none';
        console.log('Theme toggle is hidden (only available in settings)');
    }
});
