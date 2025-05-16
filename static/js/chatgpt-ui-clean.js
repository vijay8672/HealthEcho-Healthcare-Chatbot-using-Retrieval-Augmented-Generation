/**
 * ChatGPT-style UI JavaScript
 * Handles all UI interactions and functionality
 */

// DOM Elements
const elements = {};
let chatLog = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing ChatGPT-style UI...');

        // Get all elements
        getElements();

        // Setup event listeners
        setupAllEventListeners();

        // Setup textarea handlers
        setupTextareaHandlers();

        // Ensure sidebar toggle button is visible
        ensureSidebarToggleVisible();

        // Hide slider on homepage only
        hideSliderOnHomepage();

        console.log('ChatGPT-style UI initialized');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Function to show slider on all pages (including homepage)
function hideSliderOnHomepage() {
    try {
        const headerThemeToggle = document.querySelector('.header-theme-toggle');

        // Always show the theme toggle
        if (headerThemeToggle) {
            headerThemeToggle.style.display = 'flex';
            console.log('Theme toggle is now visible on all pages');
        }
    } catch (error) {
        console.error('Error setting up theme toggle visibility:', error);
    }
}

// Function to ensure sidebar toggle is visible
function ensureSidebarToggleVisible() {
    try {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');

        // Check if sidebar should be collapsed based on localStorage
        const shouldBeCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

        if (sidebar) {
            // Apply collapsed state if needed
            if (shouldBeCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }

        if (sidebar && toggleBtn) {
            // Make sure the toggle button is visible
            toggleBtn.style.display = 'flex';

            // If sidebar is collapsed, ensure toggle button has proper styling
            if (sidebar.classList.contains('collapsed')) {
                toggleBtn.style.position = 'fixed';
                toggleBtn.style.zIndex = '1000';
                toggleBtn.style.backgroundColor = 'var(--bg-secondary)';
                toggleBtn.style.border = '1px solid var(--border-color)';
                toggleBtn.style.color = 'var(--text-primary)';
            }
        }
    } catch (error) {
        console.error('Error ensuring sidebar toggle visibility:', error);
    }
}

// Get all DOM elements
function getElements() {
    try {
        elements.chatMessages = document.getElementById('chatMessages');
        elements.chatForm = document.getElementById('chatForm');
        elements.userInput = document.getElementById('userInput');
        elements.sidebar = document.getElementById('sidebar');
        elements.toggleSidebar = document.getElementById('toggleSidebar');
        elements.closeSidebar = document.getElementById('closeSidebar');
        elements.chatHistory = document.getElementById('chatHistory');
        elements.headerThemeToggle = document.getElementById('headerThemeToggle');
        elements.voiceToggle = document.getElementById('voiceToggle');
        elements.sendBtn = document.getElementById('sendBtn');
        elements.uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
        elements.fileUpload = document.getElementById('fileUpload');
        elements.uploadStatus = document.getElementById('uploadStatus');
        elements.voiceInputBtn = document.getElementById('voiceInputBtn');
        elements.chatContainer = document.querySelector('.chat-container');

        // New sidebar action buttons
        elements.sidebarSearchBtn = document.getElementById('sidebarSearchBtn');
        // Header search button removed as per user request
        elements.sidebarEditBtn = document.getElementById('sidebarEditBtn');

        console.log('All elements found');
    } catch (error) {
        console.error('Error getting elements:', error);
    }
}

// Setup all event listeners
function setupAllEventListeners() {
    try {
        console.log('Setting up all event listeners...');

        // Main form and chat interactions
        if (elements.chatForm) {
            elements.chatForm.addEventListener('submit', handleChatSubmit);
        }

        // Sidebar controls

        // Function to toggle sidebar collapse state
        function toggleSidebarCollapse() {
            if (elements.sidebar && elements.chatContainer) {
                const isCollapsed = elements.sidebar.classList.contains('collapsed');

                if (isCollapsed) {
                    // Expand sidebar
                    elements.sidebar.classList.remove('collapsed');
                } else {
                    // Collapse sidebar
                    elements.sidebar.classList.add('collapsed');
                }

                // Save preference
                localStorage.setItem('sidebarCollapsed', !isCollapsed);
            }
        }

        // Sidebar toggle button
        if (elements.toggleSidebar) {
            elements.toggleSidebar.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    // On mobile, toggle active state
                    elements.sidebar.classList.toggle('active');
                } else {
                    // On desktop, toggle collapse state
                    toggleSidebarCollapse();
                }
            });
        }

        // Close button (mobile only)
        if (elements.closeSidebar) {
            elements.closeSidebar.addEventListener('click', () => {
                if (elements.sidebar) {
                    elements.sidebar.classList.remove('active');
                }
            });
        }

        // Load saved sidebar preferences
        if (elements.sidebar) {
            // Load collapse state
            const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (sidebarCollapsed) {
                elements.sidebar.classList.add('collapsed');
            }

            // For backward compatibility
            const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
            if (sidebarHidden) {
                elements.sidebar.classList.add('hidden');
                const appContainer = document.querySelector('.app-container');
                if (appContainer) appContainer.classList.add('sidebar-hidden');
            }
        }

        // Theme toggle function
        function setDarkMode(isDarkMode) {
            document.body.className = isDarkMode ? 'theme-dark' : 'theme-light';

            // Update header toggle without triggering events
            if (elements.headerThemeToggle) {
                elements.headerThemeToggle.checked = isDarkMode;
            }

            // Save preference
            localStorage.setItem('darkMode', isDarkMode);
        }

        // Header theme toggle
        if (elements.headerThemeToggle) {
            elements.headerThemeToggle.addEventListener('change', (e) => {
                setDarkMode(e.target.checked);
            });
        }

        // Load saved theme preference
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);

        // File upload
        if (elements.uploadDocumentBtn) {
            elements.uploadDocumentBtn.addEventListener('click', () => {
                if (elements.fileUpload) {
                    elements.fileUpload.click();
                }
            });
        }

        if (elements.fileUpload) {
            elements.fileUpload.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const fileName = e.target.files[0].name;
                    if (elements.uploadStatus) {
                        elements.uploadStatus.textContent = 'File uploaded: ' + fileName;
                    }
                }
            });
        }

        // New chat button
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', () => {
                startNewChat();
            });
        }

        // Export chat button - disabled as per user request
        // if (elements.exportChat) {
        //     elements.exportChat.addEventListener('click', () => {
        //         exportChatHistory();
        //     });
        // }

        // Clear chat button - disabled as per user request
        // if (elements.clearChat) {
        //     elements.clearChat.addEventListener('click', () => {
        //         startNewChat();
        //     });
        // }

        // Voice input button
        if (elements.voiceInputBtn) {
            elements.voiceInputBtn.addEventListener('click', () => {
                // Show the voice modal
                const voiceModal = document.getElementById('voiceModal');
                if (voiceModal) {
                    voiceModal.style.display = 'flex';
                    // Start recording automatically
                    startVoiceRecording();

                    // Set up the submit button
                    const submitVoiceInput = document.getElementById('submitVoiceInput');
                    if (submitVoiceInput) {
                        submitVoiceInput.addEventListener('click', function() {
                            const transcriptionResult = document.getElementById('transcriptionResult');
                            if (transcriptionResult && transcriptionResult.textContent.trim()) {
                                // Set the input value to the transcription
                                elements.userInput.value = transcriptionResult.textContent.trim();

                                // Trigger input event to enable send button
                                elements.userInput.dispatchEvent(new Event('input', { bubbles: true }));

                                // Focus on the input field so user can edit if needed
                                elements.userInput.focus();

                                // Close the modal
                                voiceModal.style.display = 'none';

                                // Don't automatically submit the form
                                // Let the user press Enter or click the send button
                            }
                        });
                    }

                    // Set up the cancel button
                    const cancelVoiceInput = document.getElementById('cancelVoiceInput');
                    if (cancelVoiceInput) {
                        cancelVoiceInput.addEventListener('click', function() {
                            // Stop recording
                            stopVoiceRecording();

                            // Close the modal
                            voiceModal.style.display = 'none';
                        });
                    }

                    // Set up the close button
                    const closeVoiceModal = document.getElementById('closeVoiceModal');
                    if (closeVoiceModal) {
                        closeVoiceModal.addEventListener('click', function() {
                            // Stop recording
                            stopVoiceRecording();

                            // Close the modal
                            voiceModal.style.display = 'none';
                        });
                    }
                }
            });
        }

        // Chat history items
        const chatHistoryItems = document.querySelectorAll('.chat-history-item');
        chatHistoryItems.forEach(function(item) {
            item.addEventListener('click', function() {
                const chatId = this.getAttribute('data-id');

                // Remove active class from all items
                chatHistoryItems.forEach(i => i.classList.remove('active'));

                // Add active class to clicked item
                this.classList.add('active');

                // In a real implementation, this would load the selected chat
                loadChat(chatId);
            });
        });

        // Set up suggestion chips
        setupSuggestionChips();

        // Set up sidebar action buttons
        setupSidebarActionButtons();

        // Header search button removed as per user request

        console.log('All event listeners set up');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Setup suggestion chips
function setupSuggestionChips() {
    try {
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', function() {
                const suggestion = this.textContent.trim();
                submitSuggestion(suggestion);
            });
        });
        console.log(`Set up ${suggestionChips.length} suggestion chips`);
    } catch (error) {
        console.error('Error setting up suggestion chips:', error);
    }
}

// Setup sidebar action buttons
function setupSidebarActionButtons() {
    try {
        console.log('Setting up sidebar action buttons...');

        // Search button
        if (elements.sidebarSearchBtn) {
            elements.sidebarSearchBtn.addEventListener('click', function() {
                console.log('Sidebar search button clicked');
                // Create a search modal or show search interface
                showSearchInterface();
            });
        }

        // Edit button
        if (elements.sidebarEditBtn) {
            elements.sidebarEditBtn.addEventListener('click', function() {
                console.log('Sidebar edit button clicked');
                // Show edit interface or options
                showEditInterface();
            });
        }

        console.log('Sidebar action buttons set up successfully');
    } catch (error) {
        console.error('Error setting up sidebar action buttons:', error);
    }
}

// Show search interface
function showSearchInterface() {
    try {
        // Create a simple search modal
        const searchModal = document.createElement('div');
        searchModal.className = 'modal';
        searchModal.id = 'searchModal';

        searchModal.innerHTML = `
            <div class="modal-content search-modal-content">
                <div class="modal-header">
                    <h3>Search Conversations</h3>
                    <button id="closeSearchModal" class="icon-button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-form">
                        <div class="form-group">
                            <input type="text" id="modalSearchInput" class="form-control" placeholder="Search chats...">
                        </div>
                        <div class="new-chat-option">
                            <div class="search-result-item new-chat-item">
                                <div class="search-result-title">New chat</div>
                            </div>
                        </div>
                        <div class="search-section-divider">Today</div>
                        <div id="searchResults" class="search-results">
                            <p class="search-prompt">Enter keywords to search through your conversations</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(searchModal);

        // Show the modal
        setTimeout(() => {
            searchModal.style.display = 'flex'; // Changed to flex to enable centering
            searchModal.style.alignItems = 'center';
            searchModal.style.justifyContent = 'center';

            // Focus the search input
            const searchInput = document.getElementById('modalSearchInput');
            if (searchInput) {
                searchInput.focus();
            }

            // Define escape key handler
            const handleEscapeKey = function(e) {
                if (e.key === 'Escape') {
                    searchModal.style.display = 'none';
                    document.removeEventListener('keydown', handleEscapeKey);
                    setTimeout(() => {
                        searchModal.remove();
                    }, 300);
                }
            };

            // Close button functionality
            const closeBtn = document.getElementById('closeSearchModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    searchModal.style.display = 'none';
                    document.removeEventListener('keydown', handleEscapeKey);
                    setTimeout(() => {
                        searchModal.remove();
                    }, 300);
                });
            }

            // Add escape key listener
            document.addEventListener('keydown', handleEscapeKey);

            // New chat functionality
            const newChatItem = searchModal.querySelector('.new-chat-item');
            if (newChatItem) {
                newChatItem.addEventListener('click', () => {
                    // Close the search modal
                    searchModal.style.display = 'none';
                    document.removeEventListener('keydown', handleEscapeKey);
                    setTimeout(() => {
                        searchModal.remove();
                    }, 300);

                    // Start a new chat
                    startNewChat();
                });
            }

            // Search input functionality
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim();
                    if (query.length > 2) {
                        // Search through actual chat history
                        const searchResults = document.getElementById('searchResults');
                        if (searchResults) {
                            // Get saved chats from localStorage
                            let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

                            // Filter chats based on search query
                            const matchingChats = savedChats.filter(chat => {
                                // Search in chat title and content
                                const titleMatch = chat.title && chat.title.toLowerCase().includes(query.toLowerCase());
                                const contentMatch = chat.messages && chat.messages.some(msg =>
                                    msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
                                );
                                return titleMatch || contentMatch;
                            });

                            if (matchingChats.length > 0) {
                                // Group chats by date
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const yesterday = new Date(today);
                                yesterday.setDate(yesterday.getDate() - 1);

                                const lastWeekStart = new Date(today);
                                lastWeekStart.setDate(lastWeekStart.getDate() - 7);

                                const lastMonthStart = new Date(today);
                                lastMonthStart.setDate(lastMonthStart.getDate() - 30);

                                // Sort by date (newest first)
                                matchingChats.sort((a, b) => {
                                    const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
                                    const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
                                    return dateB - dateA;
                                });

                                // Group chats
                                const todayChats = matchingChats.filter(chat => {
                                    const chatDate = chat.timestamp ? new Date(chat.timestamp) : null;
                                    return chatDate && chatDate >= today;
                                });

                                const yesterdayChats = matchingChats.filter(chat => {
                                    const chatDate = chat.timestamp ? new Date(chat.timestamp) : null;
                                    return chatDate && chatDate >= yesterday && chatDate < today;
                                });

                                const lastWeekChats = matchingChats.filter(chat => {
                                    const chatDate = chat.timestamp ? new Date(chat.timestamp) : null;
                                    return chatDate && chatDate >= lastWeekStart && chatDate < yesterday;
                                });

                                const olderChats = matchingChats.filter(chat => {
                                    const chatDate = chat.timestamp ? new Date(chat.timestamp) : null;
                                    return chatDate && chatDate < lastWeekStart;
                                });

                                // Build HTML
                                let resultsHTML = '';

                                // Add today's chats
                                if (todayChats.length > 0) {
                                    resultsHTML += '<div class="search-section-divider">Today</div>';
                                    todayChats.forEach(chat => {
                                        // Find a snippet that contains the search query
                                        let snippet = '';
                                        if (chat.messages && chat.messages.length > 0) {
                                            const matchingMessage = chat.messages.find(msg =>
                                                msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
                                            );
                                            if (matchingMessage) {
                                                const content = matchingMessage.content;
                                                const index = content.toLowerCase().indexOf(query.toLowerCase());
                                                const start = Math.max(0, index - 20);
                                                const end = Math.min(content.length, index + query.length + 20);
                                                snippet = '...' + content.substring(start, end) + '...';
                                                // Highlight the query in the snippet
                                                snippet = snippet.replace(new RegExp(query, 'gi'), match =>
                                                    `<span class="highlight">${match}</span>`
                                                );
                                            }
                                        }

                                        resultsHTML += `
                                            <div class="search-result-item" data-chat-id="${chat.id}">
                                                <div class="search-result-content">
                                                    <div class="search-result-title">${chat.title || 'Untitled Chat'}</div>
                                                    <div class="search-result-snippet">${snippet}</div>
                                                </div>
                                            </div>
                                        `;
                                    });
                                }

                                // Add yesterday's chats
                                if (yesterdayChats.length > 0) {
                                    resultsHTML += '<div class="search-section-divider">Yesterday</div>';
                                    yesterdayChats.forEach(chat => {
                                        // Find a snippet that contains the search query
                                        let snippet = '';
                                        if (chat.messages && chat.messages.length > 0) {
                                            const matchingMessage = chat.messages.find(msg =>
                                                msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
                                            );
                                            if (matchingMessage) {
                                                const content = matchingMessage.content;
                                                const index = content.toLowerCase().indexOf(query.toLowerCase());
                                                const start = Math.max(0, index - 20);
                                                const end = Math.min(content.length, index + query.length + 20);
                                                snippet = '...' + content.substring(start, end) + '...';
                                                // Highlight the query in the snippet
                                                snippet = snippet.replace(new RegExp(query, 'gi'), match =>
                                                    `<span class="highlight">${match}</span>`
                                                );
                                            }
                                        }

                                        resultsHTML += `
                                            <div class="search-result-item" data-chat-id="${chat.id}">
                                                <div class="search-result-content">
                                                    <div class="search-result-title">${chat.title || 'Untitled Chat'}</div>
                                                    <div class="search-result-snippet">${snippet}</div>
                                                </div>
                                            </div>
                                        `;
                                    });
                                }

                                // Add last week's chats
                                if (lastWeekChats.length > 0) {
                                    resultsHTML += '<div class="search-section-divider">Previous 7 Days</div>';
                                    lastWeekChats.forEach(chat => {
                                        // Find a snippet that contains the search query
                                        let snippet = '';
                                        if (chat.messages && chat.messages.length > 0) {
                                            const matchingMessage = chat.messages.find(msg =>
                                                msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
                                            );
                                            if (matchingMessage) {
                                                const content = matchingMessage.content;
                                                const index = content.toLowerCase().indexOf(query.toLowerCase());
                                                const start = Math.max(0, index - 20);
                                                const end = Math.min(content.length, index + query.length + 20);
                                                snippet = '...' + content.substring(start, end) + '...';
                                                // Highlight the query in the snippet
                                                snippet = snippet.replace(new RegExp(query, 'gi'), match =>
                                                    `<span class="highlight">${match}</span>`
                                                );
                                            }
                                        }

                                        resultsHTML += `
                                            <div class="search-result-item" data-chat-id="${chat.id}">
                                                <div class="search-result-content">
                                                    <div class="search-result-title">${chat.title || 'Untitled Chat'}</div>
                                                    <div class="search-result-snippet">${snippet}</div>
                                                </div>
                                            </div>
                                        `;
                                    });
                                }

                                // Add older chats
                                if (olderChats.length > 0) {
                                    resultsHTML += '<div class="search-section-divider">Previous 30 Days</div>';
                                    olderChats.forEach(chat => {
                                        // Find a snippet that contains the search query
                                        let snippet = '';
                                        if (chat.messages && chat.messages.length > 0) {
                                            const matchingMessage = chat.messages.find(msg =>
                                                msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
                                            );
                                            if (matchingMessage) {
                                                const content = matchingMessage.content;
                                                const index = content.toLowerCase().indexOf(query.toLowerCase());
                                                const start = Math.max(0, index - 20);
                                                const end = Math.min(content.length, index + query.length + 20);
                                                snippet = '...' + content.substring(start, end) + '...';
                                                // Highlight the query in the snippet
                                                snippet = snippet.replace(new RegExp(query, 'gi'), match =>
                                                    `<span class="highlight">${match}</span>`
                                                );
                                            }
                                        }

                                        resultsHTML += `
                                            <div class="search-result-item" data-chat-id="${chat.id}">
                                                <div class="search-result-content">
                                                    <div class="search-result-title">${chat.title || 'Untitled Chat'}</div>
                                                    <div class="search-result-snippet">${snippet}</div>
                                                </div>
                                            </div>
                                        `;
                                    });
                                }

                                searchResults.innerHTML = resultsHTML;
                            } else {
                                // No matching chats found
                                searchResults.innerHTML = `
                                    <p class="search-prompt">No conversations found matching "${query}"</p>
                                `;
                            }

                            // Add click handlers to search results
                            const resultItems = searchResults.querySelectorAll('.search-result-item');
                            resultItems.forEach(item => {
                                item.addEventListener('click', function() {
                                    const chatId = this.getAttribute('data-chat-id');
                                    if (chatId) {
                                        // Close the search modal
                                        searchModal.style.display = 'none';
                                        document.removeEventListener('keydown', handleEscapeKey);
                                        setTimeout(() => {
                                            searchModal.remove();
                                        }, 300);

                                        // Load the selected chat and indicate it was loaded from search
                                        loadChat(chatId, true);
                                    }
                                });
                            });
                        }
                    } else {
                        // Clear results if query is too short
                        const searchResults = document.getElementById('searchResults');
                        if (searchResults) {
                            searchResults.innerHTML = `
                                <p class="search-prompt">Enter keywords to search through your conversations</p>
                            `;
                        }
                    }
                });
            }
        }, 10);

    } catch (error) {
        console.error('Error showing search interface:', error);
    }
}

// Show edit interface
function showEditInterface() {
    try {
        // Create a simple edit options modal
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.id = 'editModal';

        editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Options</h3>
                    <button id="closeEditModal" class="icon-button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="edit-options">
                        <button class="edit-option-btn" id="editProfileBtn">
                            <i class="fas fa-user-edit"></i>
                            <span>Edit Profile</span>
                        </button>
                        <button class="edit-option-btn" id="editPreferencesBtn">
                            <i class="fas fa-cog"></i>
                            <span>Preferences</span>
                        </button>
                        <button class="edit-option-btn" id="editHistoryBtn">
                            <i class="fas fa-history"></i>
                            <span>Manage History</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);

        // Show the modal
        setTimeout(() => {
            editModal.style.display = 'block';

            // Close button functionality
            const closeBtn = document.getElementById('closeEditModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    editModal.style.display = 'none';
                    setTimeout(() => {
                        editModal.remove();
                    }, 300);
                });
            }

            // Button click handlers
            const editProfileBtn = document.getElementById('editProfileBtn');
            const editPreferencesBtn = document.getElementById('editPreferencesBtn');
            const editHistoryBtn = document.getElementById('editHistoryBtn');

            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', () => {
                    alert('Edit Profile functionality would be implemented here');
                });
            }

            if (editPreferencesBtn) {
                editPreferencesBtn.addEventListener('click', () => {
                    alert('Edit Preferences functionality would be implemented here');
                });
            }

            if (editHistoryBtn) {
                editHistoryBtn.addEventListener('click', () => {
                    alert('Manage History functionality would be implemented here');
                });
            }
        }, 10);

    } catch (error) {
        console.error('Error showing edit interface:', error);
    }
}

// Setup textarea auto-resize and send button state
function setupTextareaHandlers() {
    try {
        console.log('Setting up textarea handlers...');

        if (!elements.userInput || !elements.sendBtn) {
            console.error('Textarea or send button not found');
            return;
        }

        // Initial state
        elements.sendBtn.disabled = true;

        // Auto-resize textarea and toggle send button
        elements.userInput.addEventListener('input', function() {
            try {
                // Enable/disable send button based on content only
                const hasContent = this.value.trim() !== '';
                elements.sendBtn.disabled = !hasContent;

                // Auto-resize
                this.style.height = 'auto';
                const newHeight = Math.min(this.scrollHeight, 200);
                this.style.height = newHeight + 'px';
            } catch (error) {
                console.error('Error in textarea input handler:', error);
            }
        });

        // Handle Enter key (send on Enter, new line on Shift+Enter)
        elements.userInput.addEventListener('keydown', function(e) {
            try {
                if (e.key === 'Enter' && !e.shiftKey) {
                    if (!elements.sendBtn.disabled) {
                        e.preventDefault();
                        console.log('Enter key pressed, submitting form');
                        if (elements.chatForm) {
                            elements.chatForm.dispatchEvent(new Event('submit'));
                        }
                    }
                }
            } catch (error) {
                console.error('Error in textarea keydown handler:', error);
            }
        });

        console.log('Textarea handlers set up successfully');
    } catch (error) {
        console.error('Error setting up textarea handlers:', error);
    }
}

// Submit suggestion
function submitSuggestion(text) {
    try {
        console.log(`Submitting suggestion: ${text}`);

        if (!elements.userInput || !elements.chatForm) {
            console.error('User input or chat form not found');
            return;
        }

        // Set the input value
        elements.userInput.value = text;

        // Trigger input event to enable send button and adjust height
        elements.userInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Submit the form
        setTimeout(() => {
            elements.chatForm.dispatchEvent(new Event('submit'));
        }, 10); // Small delay to ensure input event is processed

        console.log('Suggestion submitted successfully');
    } catch (error) {
        console.error('Error submitting suggestion:', error);
    }
}

// Handle chat form submission
function handleChatSubmit(e) {
    e.preventDefault();

    try {
        const message = elements.userInput.value.trim();
        const hasFiles = window.fileManager && window.fileManager.hasFiles();

        // Only proceed if there's a message (files alone are not enough)
        if (message) {
            console.log(`Form submitted with message: ${message}`);

            // Create file information string if files exist
            let fileInfo = '';
            if (hasFiles) {
                const files = window.fileManager.getFiles();
                if (files.length > 0) {
                    fileInfo = files.map(file => `📎 ${file.name}`).join('\n');
                    console.log(`Attached files: ${files.length}`);
                }
            }

            // Combine message and file info
            let fullMessage = message;
            if (fileInfo) {
                fullMessage = message ? `${message}\n\n${fileInfo}` : fileInfo;
            }

            // Add user message
            addMessageToUI('user', fullMessage);

            // Clear input and reset height
            elements.userInput.value = '';
            elements.userInput.style.height = 'auto';
            elements.sendBtn.disabled = true;

            // Lock files after submission
            if (hasFiles) {
                window.fileManager.lockFiles();
            }

            // Simulate bot response after a short delay
            simulateBotResponse(message);
        }
    } catch (error) {
        console.error('Error handling chat submit:', error);
    }
}

// Simulate bot response
function simulateBotResponse(userMessage) {
    try {
        // Show typing indicator
        showTypingIndicator();

        // Simulate API call delay
        setTimeout(() => {
            // Remove typing indicator
            removeTypingIndicator();

            // Generate response based on user message
            let response = "I'd be happy to help with that! Here's some information about our company policies:\n\n";

            if (userMessage.toLowerCase().includes('leave') || userMessage.toLowerCase().includes('policy')) {
                response += "## Leave Policy\n\n- Employees are entitled to 20 days of annual leave\n- Sick leave is unlimited with doctor's note\n- Parental leave is 12 weeks paid for primary caregivers\n- Bereavement leave is 5 days for immediate family";
            } else if (userMessage.toLowerCase().includes('work from home') || userMessage.toLowerCase().includes('remote')) {
                response += "## Work From Home Policy\n\n- Employees can work remotely up to 3 days per week\n- Must maintain core hours of 10am-3pm\n- Need to be available for scheduled meetings\n- Equipment is provided for home office setup";
            } else if (userMessage.toLowerCase().includes('dress code')) {
                response += "## Dress Code\n\n- Business casual is the standard dress code\n- Casual Fridays allow for jeans and t-shirts\n- Client meetings require business professional attire\n- Company logo apparel is available and encouraged";
            } else if (userMessage.toLowerCase().includes('referral')) {
                response += "## Employee Referral Program\n\n- $2,000 bonus for successful referrals after 90 days\n- Additional $1,000 if referral stays for 1 year\n- No limit on number of referrals\n- Referral must list your name on their application";
            } else {
                response += "- We have a flexible work policy that allows for remote work options\n- Our leave policy includes 20 days of annual leave plus public holidays\n- We offer comprehensive health insurance for all employees\n\nIs there anything specific you'd like to know more about?";
            }

            // Add bot message to UI
            addMessageToUI('bot', response);

        }, 1500); // Simulate thinking time

    } catch (error) {
        console.error('Error simulating bot response:', error);
        removeTypingIndicator();
    }
}

// Show typing indicator
function showTypingIndicator() {
    try {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot-message typing-indicator';
        typingIndicator.id = 'typingIndicator';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

        typingIndicator.appendChild(content);
        elements.chatMessages.appendChild(typingIndicator);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        console.log('Typing indicator shown');
    } catch (error) {
        console.error('Error showing typing indicator:', error);
    }
}

// Remove typing indicator
function removeTypingIndicator() {
    try {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
            console.log('Typing indicator removed');
        }
    } catch (error) {
        console.error('Error removing typing indicator:', error);
    }
}

// Start new chat
function startNewChat() {
    try {
        console.log('Starting new chat...');

        // Clear chat log
        chatLog = [];

        if (!elements.chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        // Clear UI
        elements.chatMessages.innerHTML = '';

        // Add welcome message
        elements.chatMessages.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-message">
                    <h2>Welcome to ZiaHR</h2>
                    <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                    <div class="suggestion-chips">
                        <button class="suggestion-chip">Leave Policy</button>
                        <button class="suggestion-chip">Referral Program</button>
                        <button class="suggestion-chip">Dress Code</button>
                        <button class="suggestion-chip">Work from Home</button>
                    </div>
                </div>
            </div>
        `;

        // Set up suggestion chips
        setupSuggestionChips();

        // Handle sidebar state
        if (elements.sidebar) {
            if (window.innerWidth <= 768) {
                // On mobile, just remove active state
                elements.sidebar.classList.remove('active');
            } else if (localStorage.getItem('sidebarCollapsed') === 'true') {
                // On desktop, maintain collapsed state if that was the user's preference
                elements.sidebar.classList.add('collapsed');
            }
        }

        console.log('New chat started successfully');
    } catch (error) {
        console.error('Error starting new chat:', error);
    }
}

// Load chat by ID
function loadChat(chatId) {
    try {
        console.log(`Loading chat ID: ${chatId}`);

        if (!elements.chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        // Clear UI
        elements.chatMessages.innerHTML = '';

        // Get saved chats from localStorage
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Find the chat with the matching ID
        const chat = savedChats.find(c => c.id === chatId);

        if (chat && chat.messages && chat.messages.length > 0) {
            // Load messages from the saved chat
            chat.messages.forEach(message => {
                const type = message.role === 'user' ? 'user' : 'bot';
                addMessageToUI(type, message.content, message.id);
            });

            console.log(`Chat ID ${chatId} loaded successfully from localStorage`);
        } else {
            // Fallback to demo conversations if chat not found
            console.log(`Chat ID ${chatId} not found in localStorage, loading demo content`);

            // Simulate different conversations based on chat ID
            if (chatId === '1') {
                addMessageToUI('user', 'What is the company\'s leave policy?');
                addMessageToUI('bot', '## Leave Policy\n\n- Employees are entitled to 20 days of annual leave\n- Sick leave is unlimited with doctor\'s note\n- Parental leave is 12 weeks paid for primary caregivers\n- Bereavement leave is 5 days for immediate family');
            } else if (chatId === '2') {
                addMessageToUI('user', 'Tell me about the work from home policy');
                addMessageToUI('bot', '## Work From Home Policy\n\n- Employees can work remotely up to 3 days per week\n- Must maintain core hours of 10am-3pm\n- Need to be available for scheduled meetings\n- Equipment is provided for home office setup');
            } else if (chatId === '3') {
                addMessageToUI('user', 'What benefits do employees get?');
                addMessageToUI('bot', '## Employee Benefits\n\n- Comprehensive health insurance\n- 401(k) matching up to 6%\n- Flexible spending accounts\n- Life insurance\n- Disability insurance\n- Employee assistance program\n- Professional development budget\n- Wellness program\n\nWould you like more details on any specific benefit?');
            }
        }

        console.log(`Chat ID ${chatId} loaded successfully`);
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}



// Setup chat search functionality
function setupChatSearch() {
    try {
        console.log('Setting up chat search functionality...');

        if (!elements.chatSearchInput || !elements.chatSearchBtn) {
            console.error('Chat search elements not found');
            return;
        }

        // Search button click handler
        elements.chatSearchBtn.addEventListener('click', () => {
            searchChats(elements.chatSearchInput.value.trim());
        });

        // Search input enter key handler
        elements.chatSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchChats(elements.chatSearchInput.value.trim());
            }
        });

        console.log('Chat search functionality set up successfully');
    } catch (error) {
        console.error('Error setting up chat search:', error);
    }
}

// Search chats functionality
function searchChats(query) {
    try {
        console.log(`Searching chats for: ${query}`);

        if (!query) {
            // If query is empty, show all chats
            const chatItems = document.querySelectorAll('.chat-history-item');
            chatItems.forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }

        // Get all chat history items
        const chatItems = document.querySelectorAll('.chat-history-item');
        let matchFound = false;

        // Filter chats based on search query
        chatItems.forEach(item => {
            const chatTitle = item.querySelector('.chat-item-title');
            if (chatTitle) {
                const title = chatTitle.textContent.toLowerCase();
                if (title.includes(query.toLowerCase())) {
                    item.style.display = 'flex';
                    matchFound = true;
                } else {
                    item.style.display = 'none';
                }
            }
        });

        // Show message if no matches found
        if (!matchFound && elements.chatHistory) {
            // Check if no-results message already exists
            let noResults = elements.chatHistory.querySelector('.no-search-results');

            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-search-results';
                noResults.textContent = 'No matching chats found';
                elements.chatHistory.appendChild(noResults);
            }
        } else {
            // Remove no-results message if it exists
            const noResults = elements.chatHistory.querySelector('.no-search-results');
            if (noResults) {
                noResults.remove();
            }
        }

        console.log(`Search completed, matches found: ${matchFound}`);
    } catch (error) {
        console.error('Error searching chats:', error);
    }
}

// Export chat history
function exportChatHistory() {
    try {
        console.log('Exporting chat history...');

        // Prepare chat content
        let content = '# ZiaHR Chat Export\n\n';
        content += `Exported on: ${new Date().toLocaleString()}\n\n`;

        // Get all messages from the UI
        const messages = document.querySelectorAll('.message');

        if (messages.length === 0) {
            console.warn('No messages to export');
            return;
        }

        messages.forEach(message => {
            const isUser = message.classList.contains('user-message');
            const messageContent = message.querySelector('.message-content');

            if (messageContent) {
                content += `## ${isUser ? 'You' : 'ZiaHR'}\n\n`;
                content += `${isUser ? messageContent.textContent : messageContent.innerText}\n\n`;
            }
        });

        // Create and download file
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ziahr-chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Chat history exported successfully');
    } catch (error) {
        console.error('Error exporting chat history:', error);
    }
}

// Add message to UI
function addMessageToUI(type, message, messageId = null, sources = []) {
    try {
        // Remove welcome container if it exists
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.remove();
            console.log('Welcome container removed');
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}-message`;

        // If messageId is provided, set it as the element ID
        if (messageId) {
            messageElement.id = messageId;
        }

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';

        if (type === 'bot' || type === 'system') {
            // Use marked.js to render markdown
            contentElement.innerHTML = marked.parse(message);

            // Add footer with timestamp
            const footerElement = document.createElement('div');
            footerElement.className = 'message-footer';

            const timeElement = document.createElement('span');
            timeElement.className = 'message-time';
            timeElement.textContent = new Date().toLocaleTimeString();

            footerElement.appendChild(timeElement);
            messageElement.appendChild(contentElement);
            messageElement.appendChild(footerElement);
        } else {
            contentElement.textContent = message;
            messageElement.appendChild(contentElement);
        }

        elements.chatMessages.appendChild(messageElement);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Add to chat log
        chatLog.push({ type, message, messageId, sources, timestamp: new Date().toISOString() });

        console.log(`Added ${type} message to UI`);
    } catch (error) {
        console.error('Error adding message to UI:', error);
    }
}

// Update a message in the chat by ID
function updateMessageInChat(messageId, newMessage) {
    try {
        // Find the message element by ID
        const messageElement = document.getElementById(messageId);
        if (!messageElement) {
            console.error(`Message with ID ${messageId} not found`);
            return;
        }

        // Update the content
        const contentElement = messageElement.querySelector('.message-content');
        if (contentElement) {
            contentElement.innerHTML = marked.parse(newMessage);
        }

        // Update in chat log
        const messageIndex = chatLog.findIndex(msg => msg.messageId === messageId);
        if (messageIndex !== -1) {
            chatLog[messageIndex].message = newMessage;
        }

        console.log(`Updated message with ID ${messageId}`);
    } catch (error) {
        console.error('Error updating message in chat:', error);
    }
}
