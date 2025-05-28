/**
 * User account management functionality
 */

// Define showToastNotification if it doesn't exist
if (typeof window.showToastNotification !== 'function') {
    function showToastNotification(title, message, isError = false) {
        console.log(`Toast notification: ${title} - ${message}`);

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'simple-toast';

        // Add error class if it's an error message
        if (isError) {
            toast.classList.add('error');
        } else {
            toast.classList.add('success');
        }

        // Use the title in the message if provided
        const displayMessage = title ? `${title}: ${message}` : message;

        toast.innerHTML = `
            ${displayMessage}
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

        // Add to document
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }

    // Make it available globally
    window.showToastNotification = showToastNotification;
}

// Apply authentication state immediately before DOM content loads
// This prevents the login page flash during page refresh
(function() {
    try {
        // Check if user is already logged in
        const isLoggedIn = !!localStorage.getItem('user_data');

        // Set html and body class based on login state immediately
        if (isLoggedIn) {
            document.documentElement.classList.add('logged-in');
            document.documentElement.classList.remove('not-logged-in');
        } else {
            document.documentElement.classList.add('not-logged-in');
            document.documentElement.classList.remove('logged-in');
        }
    } catch (error) {
        console.error('Error applying initial auth state in user-account.js:', error);
    }
})();

// Function to update the user account UI based on login state
function updateUserAccountUI(userData = null) {
    const userAccountBtn = document.getElementById('userAccountBtn');

    if (!userAccountBtn) return;

    // If user data is provided or exists in localStorage, show logged in state
    const storedUserData = userData || JSON.parse(localStorage.getItem('user_data') || 'null');

    // Remove any existing click handlers to prevent conflicts
    const newUserAccountBtn = userAccountBtn.cloneNode(true);
    userAccountBtn.parentNode.replaceChild(newUserAccountBtn, userAccountBtn);

    // Update the reference to the new button
    const updatedUserAccountBtn = document.getElementById('userAccountBtn');

    if (storedUserData) {
        // User is logged in - show only icon as per user request
        updatedUserAccountBtn.innerHTML = `<i class="fas fa-user"></i>`;

        // Update body class to show logged-in UI
        document.body.classList.remove('not-logged-in');
        document.body.classList.add('logged-in');
        document.documentElement.classList.remove('not-logged-in');
        document.documentElement.classList.add('logged-in');

        // Dispatch login event
        window.dispatchEvent(new CustomEvent('user-logged-in', { detail: storedUserData }));

        // Add dropdown menu for logout
        updatedUserAccountBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Check if dropdown already exists
            let dropdown = document.querySelector('.user-dropdown');
            if (dropdown) {
                dropdown.remove();
                return;
            }

            // Create dropdown
            dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.innerHTML = `
                <div class="user-dropdown-header">
                    <div class="user-email">${storedUserData.email}</div>
                </div>
                <div class="user-dropdown-item settings">
                    <i class="fas fa-cog"></i> Settings
                </div>
            `;

            // Position dropdown
            const rect = updatedUserAccountBtn.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.top = `${rect.bottom}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;

            // Add to document
            document.body.appendChild(dropdown);

            // Add settings functionality
            const settingsBtn = dropdown.querySelector('.settings');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    // Close dropdown
                    dropdown.remove();

                    // Open settings modal
                    const settingsModal = document.getElementById('settingsModal');
                    if (settingsModal) {
                        settingsModal.style.display = 'flex';
                    }
                });
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== updatedUserAccountBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        });
    } else {
        // User is not logged in
        updatedUserAccountBtn.innerHTML = `<i class="fas fa-user"></i>`;

        // Add click handler for login modal
        updatedUserAccountBtn.addEventListener('click', openLoginModal);

        // Update body class to show pre-login UI
        document.body.classList.add('not-logged-in');
        document.body.classList.remove('logged-in');
        document.documentElement.classList.add('not-logged-in');
        document.documentElement.classList.remove('logged-in');

        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('user-logged-out'));
    }
}

// Function to handle logout
async function handleLogout() {
    try {
        console.log('Handling logout...');

        // Call logout API
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log('Logout API call successful');

            // Clear local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            // Reset pre-login message count
            localStorage.setItem('pre_login_message_count', '0');
            console.log('Cleared auth token and user data from localStorage, reset pre-login message count');

            // Remove dropdown
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown) {
                dropdown.remove();
                console.log('Removed user dropdown');
            }

            // Update body class to show pre-login UI
            document.body.classList.add('not-logged-in');
            document.body.classList.remove('logged-in');
            document.documentElement.classList.add('not-logged-in');
            document.documentElement.classList.remove('logged-in');
            console.log('Updated body classes for logout state');

            // Update UI - this will recreate the button with the correct click handler
            updateUserAccountUI(null);
            console.log('Updated user account UI for logout state');

            // Show notification
            if (typeof showToastNotification === 'function') {
                showToastNotification('Logout Successful', 'You have been logged out successfully.');
            } else {
                console.log('Toast notification function not available');
            }

            // Close settings modal if it's open
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal && settingsModal.style.display === 'flex') {
                console.log('Closing settings modal after logout');
                settingsModal.style.display = 'none';
            }

            // Dispatch logout event
            window.dispatchEvent(new CustomEvent('user-logged-out'));
            console.log('Dispatched user-logged-out event');
        } else {
            console.error('Logout failed:', data.message);
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Function to open login modal
function openLoginModal() {
    console.log('Opening login modal from user-account.js');

    // Check if this is a page refresh - don't show login modal on refresh
    const isPageRefresh = sessionStorage.getItem('is_page_refresh') === 'true';

    if (isPageRefresh) {
        console.log('Page refresh detected, not showing login modal automatically');
        return; // Don't show the modal on page refresh
    }

    const loginModal = document.getElementById('loginModal');
    const usernameInput = document.getElementById('username');
    const loginMessage = document.getElementById('loginMessage');

    if (loginModal) {
        loginModal.style.display = 'flex';
        if (usernameInput) usernameInput.focus();
        if (loginMessage) loginMessage.textContent = '';
    } else {
        console.error('Login modal not found');
    }
}

// Make openLoginModal available globally
window.openLoginModal = openLoginModal;

// Make updateUserAccountUI available globally
window.updateUserAccountUI = updateUserAccountUI;

// Make handleLogout available globally
window.handleLogout = handleLogout;

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded in user-account.js, updating user account UI');
    updateUserAccountUI();
});
