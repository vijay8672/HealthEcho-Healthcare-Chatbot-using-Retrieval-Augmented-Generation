/**
 * Archived Chats Modal Handler
 * Manages the archived chats modal and displays archived chats
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Archived chats modal handler loaded');

    // Get DOM elements
    const archivedChatsModal = document.getElementById('archivedChatsModal');
    const archivedChatsList = document.getElementById('archivedChatsList');
    const closeArchivedChatsModal = document.getElementById('closeArchivedChatsModal');
    const manageArchivedChatsBtn = document.getElementById('manageArchivedChats');

    // Initialize event listeners
    if (manageArchivedChatsBtn) {
        manageArchivedChatsBtn.addEventListener('click', openArchivedChatsModal);
    }

    if (closeArchivedChatsModal) {
        closeArchivedChatsModal.addEventListener('click', closeModal);
    }

    // Close when clicking outside the modal
    if (archivedChatsModal) {
        archivedChatsModal.addEventListener('click', (e) => {
            if (e.target === archivedChatsModal) {
                closeModal();
            }
        });
    }

    /**
     * Open the archived chats modal and load archived chats
     */
    function openArchivedChatsModal() {
        console.log('Opening archived chats modal');

        if (!archivedChatsModal || !archivedChatsList) {
            console.error('Archived chats modal elements not found');
            return;
        }

        // Close the settings modal first
        if (typeof window.closeSettingsModal === 'function') {
            window.closeSettingsModal();
        } else {
            // Fallback method to close settings modal
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.style.display = 'none';
            }
        }

        // Show the modal
        archivedChatsModal.style.display = 'flex';

        // Show loading spinner
        archivedChatsList.innerHTML = '<div class="loading-spinner">Loading archived chats...</div>';

        // Load archived chats
        loadArchivedChatsIntoModal();
    }

    /**
     * Close the archived chats modal
     */
    function closeModal() {
        console.log('Closing archived chats modal');

        if (archivedChatsModal) {
            archivedChatsModal.style.display = 'none';
        }
    }

    /**
     * Load archived chats into the modal
     */
    function loadArchivedChatsIntoModal() {
        console.log('Loading archived chats into modal');

        try {
            // Get settings from localStorage
            const settings = JSON.parse(localStorage.getItem('hr_assistant_settings') || '{}');
            const archivedChats = settings.archivedChats || [];

            // Clear the list
            if (archivedChatsList) {
                archivedChatsList.innerHTML = '';

                if (archivedChats.length === 0) {
                    // Show no archived chats message
                    const noChatsMessage = document.createElement('div');
                    noChatsMessage.className = 'no-archived-chats-message';
                    noChatsMessage.style.display = 'block';
                    noChatsMessage.innerHTML = `
                        <p>You don't have any archived chats yet.</p>
                        <p>When you archive a chat, it will appear here.</p>
                    `;
                    archivedChatsList.appendChild(noChatsMessage);
                    return;
                }

                // Sort by timestamp (newest first)
                archivedChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                // Add each chat to the list
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

                    if (restoreBtn) {
                        restoreBtn.addEventListener('click', () => {
                            restoreArchivedChat(chat.id);
                        });
                    }

                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', () => {
                            deleteArchivedChat(chat.id);
                        });
                    }

                    archivedChatsList.appendChild(chatElement);
                });
            }
        } catch (error) {
            console.error('Error loading archived chats:', error);

            if (archivedChatsList) {
                archivedChatsList.innerHTML = '<div class="error-message">Error loading archived chats</div>';
            }
        }
    }

    /**
     * Restore an archived chat
     * @param {string} chatId - ID of the chat to restore
     */
    function restoreArchivedChat(chatId) {
        console.log('Restoring archived chat:', chatId);

        try {
            // Call the global restoreArchivedChat function if available
            if (typeof window.restoreArchivedChat === 'function') {
                window.restoreArchivedChat(chatId);

                // Reload the archived chats list
                loadArchivedChatsIntoModal();
            } else {
                console.error('restoreArchivedChat function not available');
            }
        } catch (error) {
            console.error('Error restoring archived chat:', error);
        }
    }

    /**
     * Delete an archived chat
     * @param {string} chatId - ID of the chat to delete
     */
    function deleteArchivedChat(chatId) {
        console.log('Deleting archived chat:', chatId);

        try {
            // Call the global deleteArchivedChat function if available
            if (typeof window.deleteArchivedChat === 'function') {
                window.deleteArchivedChat(chatId);

                // The deleteArchivedChat function will handle reloading the list
            } else {
                console.error('deleteArchivedChat function not available');
            }
        } catch (error) {
            console.error('Error deleting archived chat:', error);
        }
    }

    // Make functions available globally
    window.openArchivedChatsModal = openArchivedChatsModal;
    window.closeArchivedChatsModal = closeModal;
    window.loadArchivedChatsIntoModal = loadArchivedChatsIntoModal;
});
