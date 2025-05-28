/**
 * Toast Notifications
 * Provides a consistent way to show toast notifications across the application
 */

/**
 * Show a toast notification
 * @param {string} title - The title of the notification
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error notification
 */
function showToastNotification(title, message, isError = false) {
    console.log(`Toast notification: ${title} - ${message} - isError: ${isError}`);

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'simple-toast';

    // Add light-theme class to ensure consistent styling
    toast.classList.add('light-theme-notification');

    // Add appropriate class based on message type
    if (isError) {
        toast.classList.add('error'); // Red for error
    } else {
        toast.classList.add('success'); // Green for success
    }

    // Force light theme styling with inline styles
    toast.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    toast.style.color = isError ? '#f44336' : '#4caf50';
    toast.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';

    // Format the message in a more elegant way
    let formattedMessage;

    if (isError) {
        // For error messages, simplify by showing just the message without the title
        formattedMessage = message;
    } else {
        // For success messages, show a simple message
        formattedMessage = title ? `${title}: ${message}` : message;
    }

    // Add appropriate icon based on message type
    const icon = isError ?
        '<i class="fas fa-exclamation-circle" style="margin-right: 10px; font-size: 16px;"></i>' :
        '<i class="fas fa-check-circle" style="margin-right: 10px; font-size: 16px;"></i>';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; flex: 1;">
            ${icon}${formattedMessage}
        </div>
        <button class="toast-close-btn">&times;</button>
    `;

    // Position at top center
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(-100px)';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    toast.style.maxWidth = '80%';
    toast.style.textAlign = 'center';

    // Add to body
    document.body.appendChild(toast);

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close-btn');

    // Force light theme styling for close button
    closeBtn.style.color = '#999';
    closeBtn.style.backgroundColor = 'transparent';

    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    });

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');

            // Remove from DOM after animation completes
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300); // Animation duration
        }
    }, 5000);
}

// Make the function available globally
window.showToastNotification = showToastNotification;
