/**
 * Settings Manager for HR Assistant
 * Handles settings and archived chats
 */

// Import showToastNotification from app-integration.js if it exists
// Otherwise define it here
if (typeof window.showToastNotification !== 'function') {
    // Show toast notification that auto-dismisses after 3 seconds
    function showToastNotification(title, message, isError = false) {
        console.log(`Toast notification: ${title} - ${message} - isError: ${isError}`);

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'simple-toast';

        // Add appropriate class based on message type
        if (isError) {
            toast.classList.add('error'); // Red for error
        } else {
            toast.classList.add('success'); // Green for success
        }

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

        // Use CSS classes for positioning instead of inline styles
        toast.style.zIndex = '9999';

        // Add to body
        document.body.appendChild(toast);

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
} else {
    // Use the global function
    const showToastNotification = window.showToastNotification;
}

// Settings object structure
const defaultSettings = {
    theme: 'system',
    language: 'auto-detect',
    voiceEnabled: false,
    alwaysShowCode: false,
    showSuggestions: true,
    archivedChats: []
};

// Initialize settings
let appSettings = loadSettings();

// DOM elements
let settingsModal;
let settingsNavItems;
let settingsPanels;
let settingsThemeSelect;
let settingsLanguageSelect;
let archivedChatsContainer;
let manageArchivedChatsBtn;
let archiveAllChatsBtn;
let deleteAllChatsBtn;
let logoutDeviceBtn;
let enableMFABtn;
let logoutAllDevicesBtn;
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
        settingsNavItems = document.querySelectorAll('.settings-nav-item');
        settingsPanels = document.querySelectorAll('.settings-panel');

        // Theme settings
        settingsThemeSelect = document.getElementById('themeSelect');

        // Language settings
        settingsLanguageSelect = document.getElementById('languageSelect');

        // Archived chats
        archivedChatsContainer = document.getElementById('archivedChatsContainer');
        manageArchivedChatsBtn = document.getElementById('manageArchivedChats');
        archiveAllChatsBtn = document.getElementById('archiveAllChats');
        deleteAllChatsBtn = document.getElementById('deleteAllChats');

        // Security settings
        logoutDeviceBtn = document.getElementById('logoutDevice');
        enableMFABtn = document.getElementById('enableMFA');
        logoutAllDevicesBtn = document.getElementById('logoutAllDevices');



        // Modal controls
        closeSettingsBtn = document.getElementById('closeSettings');
        saveSettingsBtn = document.getElementById('saveSettings');
        closeSettingsModalBtn = document.getElementById('closeSettingsModal');

        // Add settings button to user dropdown
        addSettingsButtonToUserDropdown();

        // Set up event listeners
        setupSettingsEventListeners();

        // Load settings into UI
        loadSettingsIntoUI();

        // Apply theme from settings
        applyTheme(appSettings.theme || 'system');

        console.log('Settings manager initialized');
    } catch (error) {
        console.error('Error initializing settings manager:', error);
    }
}

/**
 * Add settings button to user dropdown
 * This function now works with user-account.js instead of overriding it
 */
function addSettingsButtonToUserDropdown() {
    try {
        console.log('Setting up settings functionality for user dropdown...');

        // Instead of overriding the user account button click handler,
        // we'll listen for when the dropdown is created and add our functionality

        // Create a mutation observer to watch for the dropdown being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any of the added nodes is our dropdown
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('user-dropdown')) {
                            console.log('User dropdown detected, adding settings functionality');

                            // Find the settings button in the dropdown
                            const settingsBtn = node.querySelector('.settings');
                            if (settingsBtn) {
                                // Remove any existing click listeners
                                const newSettingsBtn = settingsBtn.cloneNode(true);
                                settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);

                                // Add our click listener
                                newSettingsBtn.addEventListener('click', () => {
                                    // Close dropdown
                                    node.remove();

                                    // Open settings modal
                                    openSettingsModal();
                                });
                            }
                        }
                    });
                }
            });
        });

        // Start observing the document body for changes
        observer.observe(document.body, { childList: true, subtree: true });

        // Add event listener for user logout to close settings modal
        window.addEventListener('user-logged-out', () => {
            console.log('Detected user-logged-out event, closing settings modal if open');
            closeSettingsModal();
        });

        console.log('Settings functionality for user dropdown set up successfully');
    } catch (error) {
        console.error('Error adding settings button to user dropdown:', error);
    }
}

/**
 * Set up event listeners for settings
 */
function setupSettingsEventListeners() {
    try {
        // Navigation item switching
        settingsNavItems.forEach(navItem => {
            navItem.addEventListener('click', () => {
                const tabId = navItem.getAttribute('data-tab');

                // Update active nav item
                settingsNavItems.forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');

                // Update active panel
                settingsPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `${tabId}-panel`) {
                        panel.classList.add('active');
                    }
                });
            });
        });

        // Toggle switches for code and suggestions
        const alwaysShowCodeToggle = document.getElementById('alwaysShowCode');
        if (alwaysShowCodeToggle) {
            alwaysShowCodeToggle.checked = appSettings.alwaysShowCode || false;
            alwaysShowCodeToggle.addEventListener('change', (e) => {
                appSettings.alwaysShowCode = e.target.checked;
                saveSettings(appSettings);
                showToastNotification(`Always show code ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
            });
        }

        const showSuggestionsToggle = document.getElementById('showSuggestions');
        if (showSuggestionsToggle) {
            showSuggestionsToggle.checked = appSettings.showSuggestions !== false; // Default to true
            showSuggestionsToggle.addEventListener('change', (e) => {
                appSettings.showSuggestions = e.target.checked;
                saveSettings(appSettings);
                showToastNotification(`Follow-up suggestions ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
            });
        }

        // Theme dropdown
        if (settingsThemeSelect) {
            settingsThemeSelect.addEventListener('change', (e) => {
                const selectedTheme = e.target.value;
                appSettings.theme = selectedTheme;
                saveSettings(appSettings);

                // Apply theme
                applyTheme(selectedTheme);

                // Update the dropdown text to match the selected option
                const selectedOption = settingsThemeSelect.options[settingsThemeSelect.selectedIndex];
                if (selectedOption) {
                    settingsThemeSelect.style.textAlign = "left";
                }

                // Show toast notification with the appropriate message
                const themeMessage = selectedTheme === 'dark'
                    ? 'Theme has been set to dark.'
                    : selectedTheme === 'light'
                        ? 'Theme has been set to light.'
                        : 'Theme has been set to system default.';

                // Use the global showToastNotification function if available
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('', themeMessage);
                } else {
                    // Use local function
                    showToastNotification(themeMessage);
                }
            });
        }

        // Language dropdown
        if (settingsLanguageSelect) {
            settingsLanguageSelect.addEventListener('change', (e) => {
                const selectedLanguage = e.target.value;
                appSettings.language = selectedLanguage;
                saveSettings(appSettings);

                // Update the dropdown text to match the selected option
                const selectedOption = settingsLanguageSelect.options[settingsLanguageSelect.selectedIndex];
                if (selectedOption) {
                    settingsLanguageSelect.style.textAlign = "left";
                }

                // Use the global showToastNotification function if available
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('', `Language has been set to ${selectedLanguage}.`);
                } else {
                    // Use local function
                    showToastNotification(`Language has been set to ${selectedLanguage}.`);
                }
            });
        }

        // Manage archived chats button
        if (manageArchivedChatsBtn) {
            manageArchivedChatsBtn.addEventListener('click', () => {
                // Open the archived chats modal
                if (typeof window.openArchivedChatsModal === 'function') {
                    window.openArchivedChatsModal();
                } else {
                    console.error('openArchivedChatsModal function not available');
                    // Fallback to showing a notification
                    if (typeof window.showToastNotification === 'function') {
                        window.showToastNotification('', 'Loading archived chats...');
                    } else {
                        // Use local function
                        showToastNotification('Loading archived chats...');
                    }
                    // Load archived chats (for backward compatibility)
                    loadArchivedChats();
                }
            });
        }

        // Archive all chats button
        if (archiveAllChatsBtn) {
            archiveAllChatsBtn.addEventListener('click', archiveAllChats);
        }

        // Delete all chats button
        if (deleteAllChatsBtn) {
            deleteAllChatsBtn.addEventListener('click', deleteAllChats);
        }

        // Logout device button
        if (logoutDeviceBtn) {
            logoutDeviceBtn.addEventListener('click', () => {
                // Close the settings modal first
                closeSettingsModal();

                // Use the global handleLogout function if available
                if (typeof window.handleLogout === 'function') {
                    window.handleLogout();
                } else if (typeof handleLogout === 'function') {
                    handleLogout();
                } else {
                    console.error('handleLogout function not found');
                    // Fallback logout implementation
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    window.location.reload();
                }
            });
        }

        // Enable MFA button
        if (enableMFABtn) {
            enableMFABtn.addEventListener('click', enableMFA);
        }

        // Logout all devices button
        if (logoutAllDevicesBtn) {
            logoutAllDevicesBtn.addEventListener('click', logoutAllDevices);
        }



        // Close settings modal using the X button
        if (closeSettingsModalBtn) {
            closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
        }

        // Close when clicking outside the modal
        document.addEventListener('click', (e) => {
            if (settingsModal && e.target === settingsModal) {
                closeSettingsModal();
            }
        });
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

            // Disable scrolling on the body
            document.body.style.overflow = 'hidden';

            // Disable chat input while settings modal is open
            const chatInput = document.getElementById('userInput');
            if (chatInput) {
                chatInput.disabled = true;
            }

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
        console.log('Attempting to close settings modal');
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';

            // Re-enable scrolling on the body
            document.body.style.overflow = '';

            // Re-enable chat input
            const chatInput = document.getElementById('userInput');
            if (chatInput) {
                chatInput.disabled = false;
            }

            console.log('Settings modal closed successfully');
        } else {
            console.warn('Settings modal element not found');
        }
    } catch (error) {
        console.error('Error closing settings modal:', error);
    }
}

// Make closeSettingsModal available globally
window.closeSettingsModal = closeSettingsModal;

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
        // Theme setting
        if (settingsThemeSelect) {
            settingsThemeSelect.value = appSettings.theme || 'system';
            settingsThemeSelect.style.textAlign = "left";
        }

        // Language setting
        if (settingsLanguageSelect) {
            settingsLanguageSelect.value = appSettings.language || 'auto-detect';
            settingsLanguageSelect.style.textAlign = "left";
        }

        // Voice setting (kept for backward compatibility)
        const voiceToggle = document.getElementById('settingsVoiceToggle');
        if (voiceToggle) {
            voiceToggle.checked = appSettings.voiceEnabled || false;
        }

        // Always show code toggle
        const alwaysShowCodeToggle = document.getElementById('alwaysShowCode');
        if (alwaysShowCodeToggle) {
            alwaysShowCodeToggle.checked = appSettings.alwaysShowCode || false;
        }

        // Show suggestions toggle
        const showSuggestionsToggle = document.getElementById('showSuggestions');
        if (showSuggestionsToggle) {
            showSuggestionsToggle.checked = appSettings.showSuggestions !== false; // Default to true
        }
    } catch (error) {
        console.error('Error loading settings into UI:', error);
    }
}

/**
 * Save settings from UI - Auto-save when changes are made
 * This function is now called directly when settings are changed
 */
function saveSettingsFromUI() {
    try {
        const newSettings = { ...appSettings };

        // Code and suggestions toggles have been removed

        // Theme and language are handled by dropdown clicks
        // which will call this function with the appropriate values

        // Save settings
        saveSettings(newSettings);

        // No toast notification or modal closing since we're auto-saving
    } catch (error) {
        console.error('Error saving settings from UI:', error);
    }
}

/**
 * Apply theme based on selection
 * @param {string} theme - Theme to apply (system, light, dark)
 */
function applyTheme(theme) {
    try {
        let actualTheme = theme;

        if (theme === 'system') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.className = prefersDark ? 'theme-dark' : 'theme-light';
            actualTheme = prefersDark ? 'dark' : 'light';
        } else {
            document.body.className = `theme-${theme}`;
            actualTheme = theme;
        }

        // Dispatch theme changed event to notify all components
        const themeChangedEvent = new CustomEvent('themeChanged', {
            detail: { theme: actualTheme }
        });
        document.dispatchEvent(themeChangedEvent);
        console.log('Theme changed event dispatched for:', actualTheme);

        // Listen for system theme changes if using system theme
        if (theme === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (appSettings.theme === 'system') {
                    const newTheme = e.matches ? 'dark' : 'light';
                    document.body.className = e.matches ? 'theme-dark' : 'theme-light';

                    // Dispatch theme changed event when system preference changes
                    const themeChangedEvent = new CustomEvent('themeChanged', {
                        detail: { theme: newTheme }
                    });
                    document.dispatchEvent(themeChangedEvent);
                    console.log('System theme preference changed, dispatched event for:', newTheme);
                }
            });
        }
    } catch (error) {
        console.error('Error applying theme:', error);
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
        if (typeof window.loadSavedChats === 'function') {
            window.loadSavedChats(); // Refresh chat history sidebar
        }

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
        showToastNotification(`"${chat.title}" has been archived successfully.`, 'success');

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
        if (typeof window.loadSavedChats === 'function') {
            window.loadSavedChats(); // Refresh chat history sidebar
        }

        // Show toast notification with chat title
        showToastNotification(`"${chat.title}" has been restored successfully.`, 'success');

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
                // Use the global showToastNotification function if available
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('', `"${chat.title}" has been deleted successfully.`);
                } else {
                    // Use local function
                    showToastNotification(`"${chat.title}" has been deleted successfully.`);
                }

                console.log(`Chat ${chatId} deleted`);
            }
        );
    } catch (error) {
        console.error('Error deleting archived chat:', error);
    }
}

// Make archive-related functions available globally
window.archiveChat = archiveChat;
window.restoreArchivedChat = restoreArchivedChat;
window.deleteArchivedChat = deleteArchivedChat;

// Make sure showConfirmationDialog is available
if (typeof showConfirmationDialog !== 'function') {
    // Define it if not available
    function showConfirmationDialog(title, message, confirmText, cancelText, onConfirm) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="confirmation-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="btn-secondary cancel-btn">${cancelText}</button>
                    <button class="btn-primary confirm-btn">${confirmText}</button>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(modal);

        // Add button functionality
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        // Confirm button
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
} else if (typeof window.showConfirmationDialog === 'function') {
    // Use the global function if available
    var showConfirmationDialog = window.showConfirmationDialog;
}

/**
 * Archive all chats
 */
function archiveAllChats() {
    try {
        // Get saved chats
        const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        if (savedChats.length === 0) {
            // Use the global showToastNotification function if available
            if (typeof window.showToastNotification === 'function') {
                window.showToastNotification('', 'There are no chats to archive.');
            } else {
                // Use local function
                showToastNotification('There are no chats to archive.');
            }
            return;
        }

        // Show confirmation dialog
        showConfirmationDialog(
            'Archive All Chats',
            'Are you sure you want to archive all your chats? They will be moved to the archive section.',
            'Archive All',
            'Cancel',
            () => {
                // Get current archived chats
                const archivedChats = appSettings.archivedChats || [];

                // Add all saved chats to archived chats
                archivedChats.push(...savedChats);

                // Update settings
                appSettings.archivedChats = archivedChats;
                saveSettings(appSettings);

                // Clear saved chats
                localStorage.setItem('ziahr_chats', '[]');

                // Update UI
                if (typeof window.loadSavedChats === 'function') {
                    window.loadSavedChats(); // Refresh chat history sidebar
                }

                // Show toast notification
                // Use the global showToastNotification function if available
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('', `${savedChats.length} chats have been archived successfully.`);
                } else {
                    // Use local function
                    showToastNotification(`${savedChats.length} chats have been archived successfully.`);
                }

                // If we're in a chat, show welcome screen
                if (window.currentChatId) {
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

                console.log(`All chats archived (${savedChats.length} chats)`);
            }
        );
    } catch (error) {
        console.error('Error archiving all chats:', error);
        // Use the global showToastNotification function if available
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('', 'An error occurred while archiving chats.', true);
        } else {
            // Use local function
            showToastNotification('An error occurred while archiving chats.', true);
        }
    }
}

/**
 * Delete all chats
 */
function deleteAllChats() {
    try {
        // Get saved and archived chats
        const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        const archivedChats = appSettings.archivedChats || [];

        if (savedChats.length === 0 && archivedChats.length === 0) {
            // Use the global showToastNotification function if available
            if (typeof window.showToastNotification === 'function') {
                window.showToastNotification('', 'There are no chats to delete.');
            } else {
                // Use local function
                showToastNotification('There are no chats to delete.');
            }
            return;
        }

        const totalChats = savedChats.length + archivedChats.length;

        // Show confirmation dialog
        showConfirmationDialog(
            'Delete All Chats',
            `Are you sure you want to permanently delete all your chats? This action cannot be undone and will delete ${totalChats} chats.`,
            'Delete All',
            'Cancel',
            () => {
                // Clear saved chats
                localStorage.setItem('ziahr_chats', '[]');

                // Clear archived chats
                appSettings.archivedChats = [];
                saveSettings(appSettings);

                // Update UI
                if (typeof window.loadSavedChats === 'function') {
                    window.loadSavedChats(); // Refresh chat history sidebar
                }
                loadArchivedChats(); // Refresh archived chats

                // Show toast notification
                // Use the global showToastNotification function if available
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('', `${totalChats} chats have been permanently deleted.`);
                } else {
                    // Use local function
                    showToastNotification(`${totalChats} chats have been permanently deleted.`);
                }

                // If we're in a chat, show welcome screen
                if (window.currentChatId) {
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

                console.log(`All chats deleted (${totalChats} chats)`);
            }
        );
    } catch (error) {
        console.error('Error deleting all chats:', error);
        // Use the global showToastNotification function if available
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('', 'An error occurred while deleting chats.', true);
        } else {
            // Use local function
            showToastNotification('An error occurred while deleting chats.', true);
        }
    }
}

/**
 * Enable multi-factor authentication (placeholder function)
 */
function enableMFA() {
    try {
        // This is a placeholder function - in a real app, this would initiate the MFA setup process
        // Use the global showToastNotification function if available
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('', 'Multi-factor authentication setup is not available in this demo.');
        } else {
            // Use local function
            showToastNotification('Multi-factor authentication setup is not available in this demo.');
        }
    } catch (error) {
        console.error('Error enabling MFA:', error);
    }
}

/**
 * Log out of all devices (placeholder function)
 */
function logoutAllDevices() {
    try {
        // This is a placeholder function - in a real app, this would invalidate all sessions
        showConfirmationDialog(
            'Log Out of All Devices',
            'Are you sure you want to log out of all devices? This will end all active sessions, including your current session.',
            'Log Out All',
            'Cancel',
            () => {
                // Close the settings modal first
                closeSettingsModal();

                // In a real app, this would call an API to invalidate all sessions
                // For now, just log out the current user
                if (typeof window.handleLogout === 'function') {
                    window.handleLogout();
                } else if (typeof handleLogout === 'function') {
                    handleLogout();
                } else {
                    // Fallback logout implementation
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    // Reset pre-login message count
                    localStorage.setItem('pre_login_message_count', '0');
                    // Use the global showToastNotification function if available
                    if (typeof window.showToastNotification === 'function') {
                        window.showToastNotification('', 'You have been logged out of all devices.');
                    } else {
                        // Use local function
                        showToastNotification('You have been logged out of all devices.');
                    }

                    // Reload the page after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }
        );
    } catch (error) {
        console.error('Error logging out of all devices:', error);
    }
}
