/**
 * Settings Manager for HR Assistant
 * Handles settings and archived chats
 */

// Import showToastNotification from app-integration.js if it exists
// Otherwise define it here
if (typeof window.showToastNotification !== 'function') {
    // Show toast notification that auto-dismisses after 3 seconds
    function showToastNotification(title, message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'simple-toast';
        toast.innerHTML = `
            ${message}
            <button class="toast-close-btn">&times;</button>
        `;

        // Add to body
        document.body.appendChild(toast);

        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(toast);
        });

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');

            // Remove from DOM after animation completes
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300); // Animation duration
        }, 3000);
    }
} else {
    // Use the global function
    const showToastNotification = window.showToastNotification;
}

// Settings object structure
const defaultSettings = {
    theme: 'light',
    voiceEnabled: false,
    archivedChats: []
};

// Initialize settings
let appSettings = loadSettings();

// DOM elements
let settingsModal;
let settingsTabs;
let settingsPanels;
let settingsThemeToggle;
let settingsVoiceToggle;
let archivedChatsContainer;
let closeSettingsBtn;
let saveSettingsBtn;
let closeSettingsModalBtn;

// Initialize settings manager
document.addEventListener('DOMContentLoaded', () => {
    initSettingsManager();
});

/**
 * Initialize the settings manager
 */
function initSettingsManager() {
    try {
        // Get DOM elements
        settingsModal = document.getElementById('settingsModal');
        settingsTabs = document.querySelectorAll('.settings-tab');
        settingsPanels = document.querySelectorAll('.settings-panel');
        settingsThemeToggle = document.getElementById('settingsThemeToggle');
        settingsVoiceToggle = document.getElementById('settingsVoiceToggle');
        archivedChatsContainer = document.getElementById('archivedChatsContainer');
        closeSettingsBtn = document.getElementById('closeSettings');
        saveSettingsBtn = document.getElementById('saveSettings');
        closeSettingsModalBtn = document.getElementById('closeSettingsModal');

        // Add settings button to user dropdown
        addSettingsButtonToUserDropdown();

        // Set up event listeners
        setupSettingsEventListeners();

        // Load settings into UI
        loadSettingsIntoUI();

        console.log('Settings manager initialized');
    } catch (error) {
        console.error('Error initializing settings manager:', error);
    }
}

/**
 * Add settings button to user dropdown
 */
function addSettingsButtonToUserDropdown() {
    try {
        // Override the user account button click handler
        const userAccountBtn = document.getElementById('userAccountBtn');
        if (!userAccountBtn) return;

        // Store the original onclick function
        const originalOnClick = userAccountBtn.onclick;

        userAccountBtn.onclick = (e) => {
            e.stopPropagation();

            // Check if dropdown already exists
            let dropdown = document.querySelector('.user-dropdown');
            if (dropdown) {
                dropdown.remove();
                return;
            }

            // Get user data
            const storedUserData = JSON.parse(localStorage.getItem('user_data') || 'null');

            // Create dropdown
            dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';

            if (storedUserData) {
                // User is logged in
                dropdown.innerHTML = `
                    <div class="user-dropdown-header">
                        <div class="user-name">${storedUserData.full_name}</div>
                        <div class="user-email">${storedUserData.email}</div>
                    </div>
                    <div class="user-dropdown-item settings">
                        <i class="fas fa-cog"></i> Settings
                    </div>
                    <div class="user-dropdown-item logout">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </div>
                `;
            } else {
                // User is not logged in
                dropdown.innerHTML = `
                    <div class="user-dropdown-item settings">
                        <i class="fas fa-cog"></i> Settings
                    </div>
                    <div class="user-dropdown-item login">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </div>
                `;
            }

            // Position dropdown
            const rect = userAccountBtn.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.top = `${rect.bottom}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;

            // Add to document
            document.body.appendChild(dropdown);

            // Add settings functionality
            const settingsBtn = dropdown.querySelector('.settings');
            settingsBtn.addEventListener('click', openSettingsModal);

            // Add logout functionality
            const logoutBtn = dropdown.querySelector('.logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }

            // Add login functionality
            const loginBtn = dropdown.querySelector('.login');
            if (loginBtn) {
                loginBtn.addEventListener('click', openLoginModal);
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== userAccountBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        };
    } catch (error) {
        console.error('Error adding settings button to user dropdown:', error);
    }
}

/**
 * Set up event listeners for settings
 */
function setupSettingsEventListeners() {
    try {
        // Tab switching
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');

                // Update active tab
                settingsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update active panel
                settingsPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `${tabId}-panel`) {
                        panel.classList.add('active');
                    }
                });
            });
        });

        // Close settings modal
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', closeSettingsModal);
        }

        if (closeSettingsModalBtn) {
            closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
        }

        // Save settings
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettingsFromUI);
        }
    } catch (error) {
        console.error('Error setting up settings event listeners:', error);
    }
}

/**
 * Open settings modal
 */
function openSettingsModal() {
    try {
        if (settingsModal) {
            // Load archived chats
            loadArchivedChats();

            // Show modal
            settingsModal.style.display = 'flex';

            // Close any open dropdowns
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown) dropdown.remove();
        }
    } catch (error) {
        console.error('Error opening settings modal:', error);
    }
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    try {
        if (settingsModal) {
            settingsModal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing settings modal:', error);
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('hr_assistant_settings');
        return savedSettings ? JSON.parse(savedSettings) : { ...defaultSettings };
    } catch (error) {
        console.error('Error loading settings:', error);
        return { ...defaultSettings };
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings) {
    try {
        localStorage.setItem('hr_assistant_settings', JSON.stringify(settings));
        appSettings = settings;
        console.log('Settings saved');
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Load settings into UI
 */
function loadSettingsIntoUI() {
    try {
        if (settingsThemeToggle) {
            settingsThemeToggle.checked = appSettings.theme === 'dark';
        }

        if (settingsVoiceToggle) {
            settingsVoiceToggle.checked = appSettings.voiceEnabled;
        }
    } catch (error) {
        console.error('Error loading settings into UI:', error);
    }
}

/**
 * Save settings from UI
 */
function saveSettingsFromUI() {
    try {
        const newSettings = { ...appSettings };

        // Get theme setting
        if (settingsThemeToggle) {
            newSettings.theme = settingsThemeToggle.checked ? 'dark' : 'light';

            // Apply theme immediately
            document.body.className = `theme-${newSettings.theme}`;

            // Update header theme toggle
            const headerThemeToggle = document.getElementById('headerThemeToggle');
            if (headerThemeToggle) {
                headerThemeToggle.checked = newSettings.theme === 'dark';
            }
        }

        // Get voice setting
        if (settingsVoiceToggle) {
            newSettings.voiceEnabled = settingsVoiceToggle.checked;

            // Update voice toggle
            const voiceToggle = document.getElementById('voiceToggle');
            if (voiceToggle) {
                voiceToggle.checked = newSettings.voiceEnabled;
            }
        }

        // Save settings
        saveSettings(newSettings);

        // Show auto-dismissing toast notification instead of dialog
        showToastNotification('Settings Saved', 'Your settings have been saved successfully.');

        // Close modal
        closeSettingsModal();
    } catch (error) {
        console.error('Error saving settings from UI:', error);
    }
}

/**
 * Load archived chats into UI
 */
function loadArchivedChats() {
    try {
        if (!archivedChatsContainer) return;

        // Clear container
        archivedChatsContainer.innerHTML = '';

        // Get archived chats
        const archivedChats = appSettings.archivedChats || [];

        if (archivedChats.length === 0) {
            archivedChatsContainer.innerHTML = '<div class="no-archived-chats">No archived chats found</div>';
            return;
        }

        // Sort by timestamp (newest first)
        archivedChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Add each chat to the container
        archivedChats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'archived-chat-item';
            chatElement.dataset.chatId = chat.id;

            // Format date
            const chatDate = new Date(chat.timestamp);
            const formattedDate = chatDate.toLocaleDateString() + ' ' + chatDate.toLocaleTimeString();

            chatElement.innerHTML = `
                <div class="archived-chat-info">
                    <div class="archived-chat-title">${chat.title}</div>
                    <div class="archived-chat-date">${formattedDate}</div>
                </div>
                <div class="archived-chat-actions">
                    <button class="archived-chat-action restore" title="Restore chat">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                    <button class="archived-chat-action delete" title="Delete chat">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            // Add event listeners
            const restoreBtn = chatElement.querySelector('.restore');
            const deleteBtn = chatElement.querySelector('.delete');

            restoreBtn.addEventListener('click', () => restoreArchivedChat(chat.id));
            deleteBtn.addEventListener('click', () => deleteArchivedChat(chat.id));

            archivedChatsContainer.appendChild(chatElement);
        });
    } catch (error) {
        console.error('Error loading archived chats:', error);
    }
}

/**
 * Archive a chat
 * @param {string} chatId - ID of the chat to archive
 */
function archiveChat(chatId) {
    try {
        // Get saved chats
        const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Find the chat to archive
        const chatIndex = savedChats.findIndex(chat => chat.id === chatId);

        if (chatIndex === -1) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Get the chat
        const chat = savedChats[chatIndex];

        // Remove from saved chats
        savedChats.splice(chatIndex, 1);
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));

        // Add to archived chats
        const archivedChats = appSettings.archivedChats || [];
        archivedChats.push(chat);

        // Update settings
        appSettings.archivedChats = archivedChats;
        saveSettings(appSettings);

        // Update UI
        loadSavedChats(); // Refresh chat history sidebar

        // If the current chat is the one being archived, start a new chat
        if (window.currentChatId === chatId) {
            // Clear the chat messages and show welcome screen
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                // Show welcome message
                chatMessages.innerHTML = `
                    <div class="welcome-container">
                        <div class="welcome-message">
                            <h2>Welcome to ZiaHR</h2>
                            <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                            <div class="suggestion-chips">
                                <button class="suggestion-chip" onclick="submitSuggestion('What is the company\\'s leave policy?')">Leave Policy</button>
                                <button class="suggestion-chip" onclick="submitSuggestion('How does the employee referral program work?')">Referral Program</button>
                                <button class="suggestion-chip" onclick="submitSuggestion('What is the dress code policy?')">Dress Code</button>
                                <button class="suggestion-chip" onclick="submitSuggestion('Tell me about the work from home policy')">Work from Home</button>
                            </div>
                        </div>
                    </div>
                `;

                // Reset current chat ID
                window.currentChatId = null;
            }
        }

        // Show toast notification with chat title
        showToastNotification('Chat Archived', `"${chat.title}" has been archived successfully.`);

        console.log(`Chat ${chatId} archived`);
    } catch (error) {
        console.error('Error archiving chat:', error);
    }
}

/**
 * Restore an archived chat
 * @param {string} chatId - ID of the chat to restore
 */
function restoreArchivedChat(chatId) {
    try {
        // Get archived chats
        const archivedChats = appSettings.archivedChats || [];

        // Find the chat to restore
        const chatIndex = archivedChats.findIndex(chat => chat.id === chatId);

        if (chatIndex === -1) {
            console.error(`Archived chat with ID ${chatId} not found`);
            return;
        }

        // Get the chat
        const chat = archivedChats[chatIndex];

        // Remove from archived chats
        archivedChats.splice(chatIndex, 1);

        // Update settings
        appSettings.archivedChats = archivedChats;
        saveSettings(appSettings);

        // Add to saved chats
        const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        savedChats.push(chat);
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));

        // Update UI
        loadArchivedChats(); // Refresh archived chats
        loadSavedChats(); // Refresh chat history sidebar

        // Show toast notification with chat title
        showToastNotification('Chat Restored', `"${chat.title}" has been restored successfully.`);

        console.log(`Chat ${chatId} restored`);
    } catch (error) {
        console.error('Error restoring archived chat:', error);
    }
}

/**
 * Delete an archived chat
 * @param {string} chatId - ID of the chat to delete
 */
function deleteArchivedChat(chatId) {
    try {
        // Get archived chats
        const archivedChats = appSettings.archivedChats || [];

        // Find the chat to delete
        const chatIndex = archivedChats.findIndex(chat => chat.id === chatId);

        if (chatIndex === -1) {
            console.error(`Archived chat with ID ${chatId} not found`);
            return;
        }

        // Get the chat before deleting it
        const chat = archivedChats[chatIndex];

        // Use custom confirmation dialog
        showConfirmationDialog(
            'Delete Archived Chat',
            `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
            'Delete',
            'Cancel',
            () => {
                // Remove from archived chats
                archivedChats.splice(chatIndex, 1);

                // Update settings
                appSettings.archivedChats = archivedChats;
                saveSettings(appSettings);

                // Update UI
                loadArchivedChats(); // Refresh archived chats

                // Show toast notification with chat title
                showToastNotification('Chat Deleted', `"${chat.title}" has been deleted successfully.`);

                console.log(`Chat ${chatId} deleted`);
            }
        );
    } catch (error) {
        console.error('Error deleting archived chat:', error);
    }
}

// Make archive function available globally
window.archiveChat = archiveChat;

// Make sure showConfirmationDialog is available
if (typeof showConfirmationDialog !== 'function' && typeof window.showConfirmationDialog === 'function') {
    // Use the global function if available
    var showConfirmationDialog = window.showConfirmationDialog;
}
