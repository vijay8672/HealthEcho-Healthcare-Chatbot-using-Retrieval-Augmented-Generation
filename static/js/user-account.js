/**
 * User account management functionality
 */

// Function to update the user account UI based on login state
function updateUserAccountUI(userData = null) {
    const userAccountBtn = document.getElementById('userAccountBtn');

    if (!userAccountBtn) return;

    // If user data is provided or exists in localStorage, show logged in state
    const storedUserData = userData || JSON.parse(localStorage.getItem('user_data') || 'null');

    if (storedUserData) {
        // User is logged in - show only icon as per user request
        userAccountBtn.innerHTML = `<i class="fas fa-user"></i>`;

        // Add dropdown menu for logout
        userAccountBtn.onclick = (e) => {
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
                    <div class="user-name">${storedUserData.full_name}</div>
                    <div class="user-email">${storedUserData.email}</div>
                </div>
                <div class="user-dropdown-item logout">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </div>
            `;

            // Position dropdown
            const rect = userAccountBtn.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.top = `${rect.bottom}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;

            // Add to document
            document.body.appendChild(dropdown);

            // Add logout functionality
            const logoutBtn = dropdown.querySelector('.logout');
            logoutBtn.addEventListener('click', handleLogout);

            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== userAccountBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        };
    } else {
        // User is not logged in
        userAccountBtn.innerHTML = `<i class="fas fa-user"></i>`;
        userAccountBtn.onclick = openLoginModal;
    }
}

// Function to handle logout
async function handleLogout() {
    try {
        // Call logout API
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Clear local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');

            // Update UI
            updateUserAccountUI(null);

            // Show notification
            showNotificationDialog('Logout Successful', 'You have been logged out successfully.', 'OK');

            // Remove dropdown
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown) dropdown.remove();
        } else {
            console.error('Logout failed:', data.message);
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Function to open login modal
function openLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const usernameInput = document.getElementById('username');
    const loginMessage = document.getElementById('loginMessage');

    if (loginModal) {
        loginModal.style.display = 'flex';
        if (usernameInput) usernameInput.focus();
        if (loginMessage) loginMessage.textContent = '';
    }
}

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    updateUserAccountUI();
});
